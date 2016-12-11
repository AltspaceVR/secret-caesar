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
        // set up state information
        this.state = 'pending';
        this.prereqPromise = prereqPromise || Promise.resolve();
        this.execFn = execFn;
        this.cleanupFn = cleanupFn;

        // track callbacks
        this._resolveCallbacks = [];
        this._rejectCallbacks = [];
        this._execType = null;
        this._execResult = [];

        // bind events
        let cb = this._prereqSettled.bind(this);
        this.prereqPromise.then(cb, cb);
    }

    _prereqSettled(){
        if(this.state === 'pending'){
            this.state = 'running';
            function settle(type){
                return function(...args){
                    this._execSettled(type, args);
                }
            }

            this.execFn(
                settle('resolve').bind(this),
                settle('reject').bind(this)
            );
        }
        else if(this.state === 'cancelled'){
            this.state = 'settled';
            this._resolveCallbacks.forEach(cb => cb());
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
                this._resolveCallbacks.forEach(
                    (cb => cb(...this._execResult)).bind(this)
                );
            }
            else {
                this._rejectCallbacks.forEach(
                    (cb => cb(...this._execResult)).bind(this)
                );
            }
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
        if(this.state === 'settled')
        {
            if(this._execType === 'resolve'){
                doneCb(...this._execResult);
            }
            else {
                errCb(...this._execResult);
            }
        }
        else {
            this._resolveCallbacks.push(doneCb);
            if(errCb)
                this._rejectCallbacks.push(errCb);
        }

        return this;
    }

    catch(cb){
        if(this.state === 'settled'){
            if(this._execType === 'reject')
                cb(...this._execResult);
        }
        else
            this._rejectCallbacks.push(cb);

        return this;
    }
}

export default CascadingPromise;
