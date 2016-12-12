'use strict';

const DB = require('./db'),
    Utils = require('./utils'),
    Players = require('./players');

function tallyVote(voteId, userId, answer)
{
    let socket = this;
    let game = new DB.GameState(socket.gameId),
        vote = new DB.Vote(voteId);

    Promise.all([game.load(), vote.load()]).then(() =>
    {
        // make sure vote is relevant
        let votes = Utils.parseCSV(game.get('votesInProgress')),
            players = Utils.parseCSV(game.get('turnOrder')),
            yesVoters = Utils.parseCSV(vote.get('yesVoters')),
            noVoters = Utils.parseCSV(vote.get('noVoters'));

        let voteValid = votes.includes(voteId),
            userValid = players.includes(userId),
            notVoted = !yesVoters.includes(userId) && !noVoters.includes(userId),
            notBlacklisted = !Utils.parseCSV(vote.get('nonvoters')).includes(userId);

        if(voteValid && userValid && notVoted && notBlacklisted)
        {
            // tally yes vote
            if(answer){
                yesVoters.push(userId);
                vote.set('yesVoters', yesVoters.join(','));
                vote.set('yesCount', parseInt(vote.get('yesCount'))+1);
            }
            // tally no vote
            else {
                noVoters.push(userId);
                vote.set('noVoters', noVoters.join(','));
                vote.set('noCount', parseInt(vote.get('noCount'))+1);
            }

            // resolve vote if threshold reached
            if( parseInt(vote.get('yesCount')) + parseInt(vote.get('noCount'))
                >= parseInt(vote.get('requires'))
            )
            {
                let votePasses = parseInt(vote.get('yesCount')) >= parseInt(vote.get('toPass'));
                evaluateVote.call(socket, game, vote, votePasses);
            }
            else {
                vote.save().then(() => {
                    socket.server.to(socket.gameId).emit('update',
                        {votesInProgress: game.get('votesInProgress')},
                        {},
                        {[voteId]: vote.serialize()}
                    );
                });
            }
        }
        else
        {
            // generate reason string
            let reason;
            if(!voteValid) reason = 'vote completed';
            else if(!userValid) reason = 'user not playing';
            else if(!notVoted) reason = 'user has already voted';
            else if(!notBlacklisted) reason = 'user is not allowed to vote';

            console.warn('Invalid vote, not tallied. Reason:', reason);
        }
    });
}

function evaluateVote(game, vote, passed)
{
    let socket = this;

    if(vote.get('type') === 'join')
    {
        let p = new DB.Player(vote.get('target1'));
        Promise.all([game.loadPlayers(), p.load()]).then(() =>
        {
            // get prereqs
            let ids = Utils.parseCSV(game.get('turnOrder'));
            let seatTaken = ids.find(e => game.players[e].get('seatNum') == p.get('seatNum'));
    		let playerIn = ids.includes(p.get('id'));

            // add player to turn order if vote passed and still relevant
            if( passed && !seatTaken && !playerIn)
            {
                console.log('Vote passed, player joining');
                game.players[p.get('id')] = p;
                ids.push(p.get('id'));
                ids.sort((a,b) => game.players[a].get('seatNum') - game.players[b].get('seatNum'));
                game.set('turnOrder', ids.join(','));
            }
            else if(!passed){
                console.log('Vote failed, player denied entry');
            }
            else if(seatTaken){
                console.log('Vote passed, but seat became taken');
            }
            else if(playerIn){
                console.log('Vote passed, but player already seated elsewhere');
            }

            // remove completed vote from list
            let votes = Utils.parseCSV(game.get('votesInProgress'));
            votes.splice( votes.indexOf(vote.get('id')), 1 );
            game.set('votesInProgress', votes.join(','));

            // save and update clients
            Promise.all([game.save(), vote.destroy()]).then(([gd]) => {
                socket.server.to(socket.gameId).emit('update', gd,
                    passed ? {[p.get('id')]: p.serialize()} : null,
                    {[vote.get('id')]: null}
                );
            });
        });
    }
    else if(vote.get('type') === 'kick' && game.get('state') === 'setup')
    {
        let p = new DB.Player(vote.get('target1'));

        if(passed)
        {
            // totally remove kicked player if still in setup
            let ids = Utils.parseCSV(game.get('turnOrder'));
            ids.splice( ids.indexOf(p.get('id')), 1 );
            game.set('turnOrder', ids.join(','));
        }
        else {
            console.log('Vote to kick failed');
        }

        // remove completed vote from list
        let votes = Utils.parseCSV(game.get('votesInProgress'));
        votes.splice( votes.indexOf(vote.get('id')), 1 );
        game.set('votesInProgress', votes.join(','));

        // update clients
        Promise.all([game.save(), p.destroy()]).then(([gd]) => {
            socket.server.to(socket.gameId).emit('update', gd,
                passed ? {[p.get('id')]: null} : null,
                {[vote.get('id')]: null}
            );
        })
        .catch(e => console.error(e));
    }
}

exports.tallyVote = tallyVote;
