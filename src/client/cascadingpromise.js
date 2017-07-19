'use strict';

/*
* Have to completely reimplement promises from scratch for this :(
* This class is a promise that tracks dependencies, and evaluates
* when they are met. It's also cancellable, calling its dependents
* as soon as its dependencies are met.
*/
class CascadingPromise
{
    constructor(prereqPromise, execFn, cleanupFn)
    {
        this.id = CascadingPromise.id++;
        // set up state information. One of 'pending', 'running', 'cleaningup', 'settled' or 'cancelled'.
        this.state = 'pending';
        this.prereqPromise = prereqPromise || Promise.resolve();
        this.execFn = execFn;
        this.cleanupFn = cleanupFn;

        // track callbacks
        this._resolveCallback = null;
        this._rejectCallback = null;
        this._execType = null;
        this._execResult = [];
        this._nextResolve = null;
        this._nextReject = null;
        this._resolveResult = null;

        // bind events
        let cb = this._prereqSettled.bind(this);
        this.prereqPromise.then(cb, cb);
    }

    _prereqSettled(){
        function settle(type){
            return function(...args){
                this._execSettled(type, args);
            }
        }

        if(this.state === 'pending'){
            this.state = 'running';
            this.execFn(
                settle('resolve').bind(this),
                settle('reject').bind(this)
            );
        }
        else if(this.state === 'cancelled'){
            this.state = 'settled';
            this._resolveCallback();
        }
    }

    _execSettled(type, result){
        if(this.state === 'running'){
            this._execType = type;
            this._execResult = result;
            this.state = 'cleaningup';
            this.cleanupFn(this._cleanupDone.bind(this));
        }
    }

    _cleanupDone(){
        if(this.state === 'cleaningup'){
            this.state = 'settled';
            if(this._execType === 'resolve'){
                if (this._resolveCallback) {
                    this._resolveResult = this._resolveCallback(...this._execResult);
                    this._callNext();
                }
            }
            else {
                this._rejectCallback(...this._execResult);
            }
        }
    }

    _callNext(){
        if (this._resolveResult && this._nextResolve) {
            this._resolveResult.then(this._nextResolve, this._nextReject);
        }
    }

    cancel(){
        if(this.state === 'running'){
            this.state = 'cleaningup';
            this.cleanupFn(this._cleanupDone.bind(this));
        }
        else if(this.state === 'pending'){
            this.state = 'cancelled';
        }
    }

    then(doneCb, errCb)
    {
        let nextPromise = new CascadingPromise(null, (resolve, reject) => {
            this._nextResolve = resolve;
            this._nextReject = reject;
        }, (cleanupDone) => cleanupDone());

        if(this.state === 'settled')
        {
            if(this._execType === 'resolve'){
                this._resolveResult = doneCb(...this._execResult);
                this._callNext();
            }
            else {
                errCb(...this._execResult);
            }
        }
        else {
            this._resolveCallback = doneCb;
            if(errCb)
                this._rejectCallback = errCb;
        }

        return nextPromise;
    }

    catch(cb){
        if(this.state === 'settled'){
            if(this._execType === 'reject')
                cb(...this._execResult);
        }
        else
            this._rejectCallback = cb;

        return new CascadingPromise(null, (resolve, reject) => {
            this._nextResolve = resolve;
            this._nextReject = reject;
        }, (cleanupDone) => cleanupDone());
    }
}

// keep track of created promises, mostly for debugging.
CascadingPromise.id = 0;

export default CascadingPromise;
