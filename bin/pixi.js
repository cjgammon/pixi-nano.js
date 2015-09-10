(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PIXI = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= q.concurrency; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
          return a.priority - b.priority;
        };

        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }

        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };

              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
'use strict';

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],4:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			to[keys[i]] = from[keys[i]];
		}
	}

	return to;
};

},{}],5:[function(require,module,exports){
module.exports={
  "name": "pixi.js",
  "version": "3.0.7",
  "description": "Pixi.js is a fast lightweight 2D library that works across all devices.",
  "author": "Mat Groves",
  "contributors": [
    "Chad Engler <chad@pantherdev.com>",
    "Richard Davey <rdavey@gmail.com>"
  ],
  "main": "./src/index.js",
  "homepage": "http://goodboydigital.com/",
  "bugs": "https://github.com/GoodBoyDigital/pixi.js/issues",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/GoodBoyDigital/pixi.js.git"
  },
  "scripts": {
    "start": "gulp && gulp watch",
    "test": "gulp && testem ci",
    "build": "gulp",
    "docs": "jsdoc -c ./gulp/util/jsdoc.conf.json -R README.md"
  },
  "files": [
    "bin/",
    "src/"
  ],
  "dependencies": {
    "async": "^0.9.0",
    "brfs": "^1.4.0",
    "earcut": "^2.0.1",
    "eventemitter3": "^1.1.0",
    "object-assign": "^2.0.0",
    "resource-loader": "^1.6.1"
  },
  "devDependencies": {
    "browserify": "^10.2.3",
    "chai": "^3.0.0",
    "del": "^1.2.0",
    "gulp": "^3.9.0",
    "gulp-cached": "^1.1.0",
    "gulp-concat": "^2.5.2",
    "gulp-debug": "^2.0.1",
    "gulp-jshint": "^1.11.0",
    "gulp-mirror": "^0.4.0",
    "gulp-plumber": "^1.0.1",
    "gulp-rename": "^1.2.2",
    "gulp-sourcemaps": "^1.5.2",
    "gulp-uglify": "^1.2.0",
    "gulp-util": "^3.0.5",
    "jaguarjs-jsdoc": "git+https://github.com/davidshimjs/jaguarjs-jsdoc.git",
    "jsdoc": "^3.3.0",
    "jshint-summary": "^0.4.0",
    "minimist": "^1.1.1",
    "mocha": "^2.2.5",
    "require-dir": "^0.3.0",
    "run-sequence": "^1.1.0",
    "testem": "^0.8.3",
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "^1.1.0",
    "watchify": "^3.2.1"
  },
  "browserify": {
    "transform": [
      "brfs"
    ]
  }
}

},{}],6:[function(require,module,exports){
/**
 * Constant values used in pixi
 *
 * @lends PIXI
 */
var CONST = {
    /**
     * String of the current PIXI version
     *
     * @static
     * @constant
     * @property {string} VERSION
     */
    VERSION: require('../../package.json').version,

    /**
     * @property {number} PI_2 - Two Pi
     * @constant
     * @static
     */
    PI_2: Math.PI * 2,

    /**
     * @property {number} RAD_TO_DEG - Constant conversion factor for converting radians to degrees
     * @constant
     * @static
     */
    RAD_TO_DEG: 180 / Math.PI,

    /**
     * @property {Number} DEG_TO_RAD - Constant conversion factor for converting degrees to radians
     * @constant
     * @static
     */
    DEG_TO_RAD: Math.PI / 180,

    /**
     * Target frames per millisecond.
     *
     * @static
     * @constant
     * @property {number} TARGET_FPMS=0.06
     */
    TARGET_FPMS: 0.06,

    /**
     * Constant to identify the Renderer Type.
     *
     * @static
     * @constant
     * @property {object} RENDERER_TYPE
     * @property {number} RENDERER_TYPE.UNKNOWN
     * @property {number} RENDERER_TYPE.WEBGL
     * @property {number} RENDERER_TYPE.CANVAS
     */
    RENDERER_TYPE: {
        UNKNOWN:    0,
        WEBGL:      1,
        CANVAS:     2
    },

    /**
     * Various blend modes supported by PIXI. IMPORTANT - The WebGL renderer only supports
     * the NORMAL, ADD, MULTIPLY and SCREEN blend modes. Anything else will silently act like
     * NORMAL.
     *
     * @static
     * @constant
     * @property {object} BLEND_MODES
     * @property {number} BLEND_MODES.NORMAL
     * @property {number} BLEND_MODES.ADD
     * @property {number} BLEND_MODES.MULTIPLY
     * @property {number} BLEND_MODES.SCREEN
     * @property {number} BLEND_MODES.OVERLAY
     * @property {number} BLEND_MODES.DARKEN
     * @property {number} BLEND_MODES.LIGHTEN
     * @property {number} BLEND_MODES.COLOR_DODGE
     * @property {number} BLEND_MODES.COLOR_BURN
     * @property {number} BLEND_MODES.HARD_LIGHT
     * @property {number} BLEND_MODES.SOFT_LIGHT
     * @property {number} BLEND_MODES.DIFFERENCE
     * @property {number} BLEND_MODES.EXCLUSION
     * @property {number} BLEND_MODES.HUE
     * @property {number} BLEND_MODES.SATURATION
     * @property {number} BLEND_MODES.COLOR
     * @property {number} BLEND_MODES.LUMINOSITY
     */
    BLEND_MODES: {
        NORMAL:         0,
        ADD:            1,
        MULTIPLY:       2,
        SCREEN:         3,
        OVERLAY:        4,
        DARKEN:         5,
        LIGHTEN:        6,
        COLOR_DODGE:    7,
        COLOR_BURN:     8,
        HARD_LIGHT:     9,
        SOFT_LIGHT:     10,
        DIFFERENCE:     11,
        EXCLUSION:      12,
        HUE:            13,
        SATURATION:     14,
        COLOR:          15,
        LUMINOSITY:     16
    },

    /**
     * Various webgl draw modes. These can be used to specify which GL drawMode to use
     * under certain situations and renderers.
     *
     * @static
     * @constant
     * @property {object} DRAW_MODES
     * @property {number} DRAW_MODES.POINTS
     * @property {number} DRAW_MODES.LINES
     * @property {number} DRAW_MODES.LINE_LOOP
     * @property {number} DRAW_MODES.LINE_STRIP
     * @property {number} DRAW_MODES.TRIANGLES
     * @property {number} DRAW_MODES.TRIANGLE_STRIP
     * @property {number} DRAW_MODES.TRIANGLE_FAN
     */
    DRAW_MODES: {
        POINTS:         0,
        LINES:          1,
        LINE_LOOP:      2,
        LINE_STRIP:     3,
        TRIANGLES:      4,
        TRIANGLE_STRIP: 5,
        TRIANGLE_FAN:   6
    },

    /**
     * The scale modes that are supported by pixi.
     *
     * The DEFAULT scale mode affects the default scaling mode of future operations.
     * It can be re-assigned to either LINEAR or NEAREST, depending upon suitability.
     *
     * @static
     * @constant
     * @property {object} SCALE_MODES
     * @property {number} SCALE_MODES.DEFAULT=LINEAR
     * @property {number} SCALE_MODES.LINEAR Smooth scaling
     * @property {number} SCALE_MODES.NEAREST Pixelating scaling
     */
    SCALE_MODES: {
        DEFAULT:    0,
        LINEAR:     0,
        NEAREST:    1
    },

    /**
     * The prefix that denotes a URL is for a retina asset
     *
     * @static
     * @constant
     * @property {string} RETINA_PREFIX
     */
    //example: '@2x',
    RETINA_PREFIX: /@(.+)x/,

    RESOLUTION:1,

    FILTER_RESOLUTION:1,

    /**
     * The default render options if none are supplied to {@link PIXI.WebGLRenderer}
     * or {@link PIXI.CanvasRenderer}.
     *
     * @static
     * @constant
     * @property {object} DEFAULT_RENDER_OPTIONS
     * @property {HTMLCanvasElement} DEFAULT_RENDER_OPTIONS.view=null
     * @property {boolean} DEFAULT_RENDER_OPTIONS.transparent=false
     * @property {boolean} DEFAULT_RENDER_OPTIONS.antialias=false
     * @property {boolean} DEFAULT_RENDER_OPTIONS.forceFXAA=false
     * @property {boolean} DEFAULT_RENDER_OPTIONS.preserveDrawingBuffer=false
     * @property {number} DEFAULT_RENDER_OPTIONS.resolution=1
     * @property {number} DEFAULT_RENDER_OPTIONS.backgroundColor=0x000000
     * @property {boolean} DEFAULT_RENDER_OPTIONS.clearBeforeRender=true
     * @property {boolean} DEFAULT_RENDER_OPTIONS.autoResize=false
     */
    DEFAULT_RENDER_OPTIONS: {
        view: null,
        resolution: 1,
        antialias: false,
        forceFXAA: false,
        autoResize: false,
        transparent: false,
        backgroundColor: 0x000000,
        clearBeforeRender: true,
        preserveDrawingBuffer: false
    },

    /**
     * Constants that identify shapes, mainly to prevent `instanceof` calls.
     *
     * @static
     * @constant
     * @property {object} SHAPES
     * @property {object} SHAPES.POLY=0
     * @property {object} SHAPES.RECT=1
     * @property {object} SHAPES.CIRC=2
     * @property {object} SHAPES.ELIP=3
     * @property {object} SHAPES.RREC=4
     */
    SHAPES: {
        POLY: 0,
        RECT: 1,
        CIRC: 2,
        ELIP: 3,
        RREC: 4
    },

    // TODO: maybe change to SPRITE.BATCH_SIZE: 2000
    // TODO: maybe add PARTICLE.BATCH_SIZE: 15000
    SPRITE_BATCH_SIZE: 2000 //nice balance between mobile and desktop machines
};

module.exports = CONST;

},{"../../package.json":5}],7:[function(require,module,exports){
var math = require('../math'),
    DisplayObject = require('./DisplayObject'),
    RenderTexture = require('../textures/RenderTexture'),
    _tempMatrix = new math.Matrix();

/**
 * A Container represents a collection of display objects.
 * It is the base class of all display objects that act as a container for other objects.
 *
 *```js
 * var container = new PIXI.Container();
 * container.addChild(sprite);
 * ```
 * @class
 * @extends PIXI.DisplayObject
 * @memberof PIXI
 */
function Container()
{
    DisplayObject.call(this);

    /**
     * The array of children of this container.
     *
     * @member {DisplayObject[]}
     * @readonly
     */
    this.children = [];
}

// constructor
Container.prototype = Object.create(DisplayObject.prototype);
Container.prototype.constructor = Container;
module.exports = Container;

Object.defineProperties(Container.prototype, {
    /**
     * The width of the Container, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Container#
     */
    width: {
        get: function ()
        {
            return this.scale.x * this.getLocalBounds().width;
        },
        set: function (value)
        {

            var width = this.getLocalBounds().width;

            if (width !== 0)
            {
                this.scale.x = value / width;
            }
            else
            {
                this.scale.x = 1;
            }


            this._width = value;
        }
    },

    /**
     * The height of the Container, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Container#
     */
    height: {
        get: function ()
        {
            return  this.scale.y * this.getLocalBounds().height;
        },
        set: function (value)
        {

            var height = this.getLocalBounds().height;

            if (height !== 0)
            {
                this.scale.y = value / height ;
            }
            else
            {
                this.scale.y = 1;
            }

            this._height = value;
        }
    }
});

/**
 * Adds a child to the container.
 *
 * @param child {DisplayObject} The DisplayObject to add to the container
 * @return {DisplayObject} The child that was added.
 */
Container.prototype.addChild = function (child)
{
    return this.addChildAt(child, this.children.length);
};

/**
 * Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown
 *
 * @param child {DisplayObject} The child to add
 * @param index {Number} The index to place the child in
 * @return {DisplayObject} The child that was added.
 */
Container.prototype.addChildAt = function (child, index)
{
    // prevent adding self as child
    if (child === this)
    {
        return child;
    }

    if (index >= 0 && index <= this.children.length)
    {
        if (child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;

        this.children.splice(index, 0, child);

        child.emit('added', this);

        return child;
    }
    else
    {
        throw new Error(child + 'addChildAt: The index '+ index +' supplied is out of bounds ' + this.children.length);
    }
};

/**
 * Swaps the position of 2 Display Objects within this container.
 *
 * @param child {DisplayObject}
 * @param child2 {DisplayObject}
 */
Container.prototype.swapChildren = function (child, child2)
{
    if (child === child2)
    {
        return;
    }

    var index1 = this.getChildIndex(child);
    var index2 = this.getChildIndex(child2);

    if (index1 < 0 || index2 < 0)
    {
        throw new Error('swapChildren: Both the supplied DisplayObjects must be children of the caller.');
    }

    this.children[index1] = child2;
    this.children[index2] = child;
};

/**
 * Returns the index position of a child DisplayObject instance
 *
 * @param child {DisplayObject} The DisplayObject instance to identify
 * @return {Number} The index position of the child display object to identify
 */
Container.prototype.getChildIndex = function (child)
{
    var index = this.children.indexOf(child);

    if (index === -1)
    {
        throw new Error('The supplied DisplayObject must be a child of the caller');
    }

    return index;
};

/**
 * Changes the position of an existing child in the display object container
 *
 * @param child {DisplayObject} The child DisplayObject instance for which you want to change the index number
 * @param index {Number} The resulting index number for the child display object
 */
Container.prototype.setChildIndex = function (child, index)
{
    if (index < 0 || index >= this.children.length)
    {
        throw new Error('The supplied index is out of bounds');
    }

    var currentIndex = this.getChildIndex(child);

    this.children.splice(currentIndex, 1); //remove from old position
    this.children.splice(index, 0, child); //add at new position
};

/**
 * Returns the child at the specified index
 *
 * @param index {Number} The index to get the child at
 * @return {DisplayObject} The child at the given index, if any.
 */
Container.prototype.getChildAt = function (index)
{
    if (index < 0 || index >= this.children.length)
    {
        throw new Error('getChildAt: Supplied index ' + index + ' does not exist in the child list, or the supplied DisplayObject is not a child of the caller');
    }

    return this.children[index];
};

/**
 * Removes a child from the container.
 *
 * @param child {DisplayObject} The DisplayObject to remove
 * @return {DisplayObject} The child that was removed.
 */
Container.prototype.removeChild = function (child)
{
    var index = this.children.indexOf(child);

    if (index === -1)
    {
        return;
    }

    return this.removeChildAt(index);
};

/**
 * Removes a child from the specified index position.
 *
 * @param index {Number} The index to get the child from
 * @return {DisplayObject} The child that was removed.
 */
Container.prototype.removeChildAt = function (index)
{
    var child = this.getChildAt(index);

    child.parent = null;
    this.children.splice(index, 1);

    child.emit('removed', this);

    return child;
};

/**
 * Removes all children from this container that are within the begin and end indexes.
 *
 * @param beginIndex {Number} The beginning position. Default value is 0.
 * @param endIndex {Number} The ending position. Default value is size of the container.
 */
Container.prototype.removeChildren = function (beginIndex, endIndex)
{
    var begin = beginIndex || 0;
    var end = typeof endIndex === 'number' ? endIndex : this.children.length;
    var range = end - begin;

    if (range > 0 && range <= end)
    {
        var removed = this.children.splice(begin, range);

        for (var i = 0; i < removed.length; ++i)
        {
            removed[i].parent = null;
        }

        return removed;
    }
    else if (range === 0 && this.children.length === 0)
    {
        return [];
    }
    else
    {
        throw new RangeError('removeChildren: numeric values are outside the acceptable range.');
    }
};

/**
 * Useful function that returns a texture of the display object that can then be used to create sprites
 * This can be quite useful if your displayObject is static / complicated and needs to be reused multiple times.
 *
 * @param renderer {CanvasRenderer|WebGLRenderer} The renderer used to generate the texture.
 * @param resolution {Number} The resolution of the texture being generated
 * @param scaleMode {Number} See {@link SCALE_MODES} for possible values
 * @return {Texture} a texture of the display object
 */
Container.prototype.generateTexture = function (renderer, resolution, scaleMode)
{
    var bounds = this.getLocalBounds();

    var renderTexture = new RenderTexture(renderer, bounds.width | 0, bounds.height | 0, scaleMode, resolution);

    _tempMatrix.tx = -bounds.x;
    _tempMatrix.ty = -bounds.y;

    renderTexture.render(this, _tempMatrix);

    return renderTexture;
};

/*
 * Updates the transform on all children of this container for rendering
 *
 * @private
 */
Container.prototype.updateTransform = function ()
{
    if (!this.visible)
    {
        return;
    }

    this.displayObjectUpdateTransform();

    for (var i = 0, j = this.children.length; i < j; ++i)
    {
        this.children[i].updateTransform();
    }
};

// performance increase to avoid using call.. (10x faster)
Container.prototype.containerUpdateTransform = Container.prototype.updateTransform;

/**
 * Retrieves the bounds of the Container as a rectangle. The bounds calculation takes all visible children into consideration.
 *
 * @return {Rectangle} The rectangular bounding area
 */
Container.prototype.getBounds = function ()
{
    if(!this._currentBounds)
    {

        if (this.children.length === 0)
        {
            return math.Rectangle.EMPTY;
        }

        // TODO the bounds have already been calculated this render session so return what we have

        var minX = Infinity;
        var minY = Infinity;

        var maxX = -Infinity;
        var maxY = -Infinity;

        var childBounds;
        var childMaxX;
        var childMaxY;

        var childVisible = false;

        for (var i = 0, j = this.children.length; i < j; ++i)
        {
            var child = this.children[i];

            if (!child.visible)
            {
                continue;
            }

            childVisible = true;

            childBounds = this.children[i].getBounds();

            minX = minX < childBounds.x ? minX : childBounds.x;
            minY = minY < childBounds.y ? minY : childBounds.y;

            childMaxX = childBounds.width + childBounds.x;
            childMaxY = childBounds.height + childBounds.y;

            maxX = maxX > childMaxX ? maxX : childMaxX;
            maxY = maxY > childMaxY ? maxY : childMaxY;
        }

        if (!childVisible)
        {
            return math.Rectangle.EMPTY;
        }

        var bounds = this._bounds;

        bounds.x = minX;
        bounds.y = minY;
        bounds.width = maxX - minX;
        bounds.height = maxY - minY;

        this._currentBounds = bounds;
    }

    return this._currentBounds;
};

Container.prototype.containerGetBounds = Container.prototype.getBounds;

/**
 * Retrieves the non-global local bounds of the Container as a rectangle.
 * The calculation takes all visible children into consideration.
 *
 * @return {Rectangle} The rectangular bounding area
 */
Container.prototype.getLocalBounds = function ()
{
    var matrixCache = this.worldTransform;

    this.worldTransform = math.Matrix.IDENTITY;

    for (var i = 0, j = this.children.length; i < j; ++i)
    {
        this.children[i].updateTransform();
    }

    this.worldTransform = matrixCache;

    this._currentBounds = null;

    return this.getBounds( math.Matrix.IDENTITY );
};

/**
 * Renders the object using the WebGL renderer
 *
 * @param renderer {WebGLRenderer} The renderer
 */
Container.prototype.renderWebGL = function (renderer)
{

    // if the object is not visible or the alpha is 0 then no need to render this element
    if (!this.visible || this.worldAlpha <= 0 || !this.renderable)
    {
        return;
    }

    var i, j;

    // do a quick check to see if this element has a mask or a filter.
    if (this._mask || this._filters)
    {
        renderer.currentRenderer.flush();

        // push filter first as we need to ensure the stencil buffer is correct for any masking
        if (this._filters)
        {
            renderer.filterManager.pushFilter(this, this._filters);
        }

        if (this._mask)
        {
            renderer.maskManager.pushMask(this, this._mask);
        }

        renderer.currentRenderer.start();

        // add this object to the batch, only rendered if it has a texture.
        this._renderWebGL(renderer);

        // now loop through the children and make sure they get rendered
        for (i = 0, j = this.children.length; i < j; i++)
        {
            this.children[i].renderWebGL(renderer);
        }

        renderer.currentRenderer.flush();

        if (this._mask)
        {
            renderer.maskManager.popMask(this, this._mask);
        }

        if (this._filters)
        {
            renderer.filterManager.popFilter();

        }
        renderer.currentRenderer.start();
    }
    else
    {
        this._renderWebGL(renderer);

        // simple render children!
        for (i = 0, j = this.children.length; i < j; ++i)
        {
            this.children[i].renderWebGL(renderer);
        }
    }
};

/**
 * To be overridden by the subclass
 *
 * @param renderer {WebGLRenderer} The renderer
 * @private
 */
Container.prototype._renderWebGL = function (renderer) // jshint unused:false
{
    // this is where content itself gets rendered...
};

/**
 * To be overridden by the subclass
 *
 * @param renderer {CanvasRenderer} The renderer
 * @private
 */
Container.prototype._renderCanvas = function (renderer) // jshint unused:false
{
    // this is where content itself gets rendered...
};


/**
 * Renders the object using the Canvas renderer
 *
 * @param renderer {CanvasRenderer} The renderer
 */
Container.prototype.renderCanvas = function (renderer)
{
    // if not visible or the alpha is 0 then no need to render this
    if (!this.visible || this.alpha <= 0 || !this.renderable)
    {
        return;
    }

    if (this._mask)
    {
        renderer.maskManager.pushMask(this._mask, renderer);
    }

    this._renderCanvas(renderer);
    for (var i = 0, j = this.children.length; i < j; ++i)
    {
        this.children[i].renderCanvas(renderer);
    }

    if (this._mask)
    {
        renderer.maskManager.popMask(renderer);
    }
};

/**
 * Destroys the container
 * @param [destroyChildren=false] {boolean} if set to true, all the children will have their destroy method called as well
 */
Container.prototype.destroy = function (destroyChildren)
{
    DisplayObject.prototype.destroy.call(this);

    if (destroyChildren)
    {
        for (var i = 0, j = this.children.length; i < j; ++i)
        {
            this.children[i].destroy(destroyChildren);
        }
    }

    this.removeChildren();

    this.children = null;
};

},{"../math":12,"../textures/RenderTexture":40,"./DisplayObject":8}],8:[function(require,module,exports){
var math = require('../math'),
    RenderTexture = require('../textures/RenderTexture'),
    EventEmitter = require('eventemitter3'),
    CONST = require('../const'),
    _tempMatrix = new math.Matrix();

/**
 * The base class for all objects that are rendered on the screen.
 * This is an abstract class and should not be used on its own rather it should be extended.
 *
 * @class
 * @extends EventEmitter
 * @memberof PIXI
 */
function DisplayObject()
{
    EventEmitter.call(this);

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     *
     * @member {Point}
     */
    this.position = new math.Point();

    /**
     * The scale factor of the object.
     *
     * @member {Point}
     */
    this.scale = new math.Point(1, 1);

    /**
     * The pivot point of the displayObject that it rotates around
     *
     * @member {Point}
     */
    this.pivot = new math.Point(0, 0);

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    this.rotation = 0;

    /**
     * The opacity of the object.
     *
     * @member {number}
     */
    this.alpha = 1;

    /**
     * The visibility of the object. If false the object will not be drawn, and
     * the updateTransform function will not be called.
     *
     * @member {boolean}
     */
    this.visible = true;

    /**
     * Can this object be rendered, if false the object will not be drawn but the updateTransform
     * methods will still be called.
     *
     * @member {boolean}
     */
    this.renderable = true;

    /**
     * The display object container that contains this display object.
     *
     * @member {Container}
     * @readOnly
     */
    this.parent = null;

    /**
     * The multiplied alpha of the displayObject
     *
     * @member {number}
     * @readOnly
     */
    this.worldAlpha = 1;

    /**
     * Current transform of the object based on world (parent) factors
     *
     * @member {Matrix}
     * @readOnly
     */
    this.worldTransform = new math.Matrix();

    /**
     * The area the filter is applied to. This is used as more of an optimisation
     * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle
     *
     * @member {Rectangle}
     */
    this.filterArea = null;

    /**
     * cached sin rotation
     *
     * @member {number}
     * @private
     */
    this._sr = 0;

    /**
     * cached cos rotation
     *
     * @member {number}
     * @private
     */
    this._cr = 1;

    /**
     * The original, cached bounds of the object
     *
     * @member {Rectangle}
     * @private
     */
    this._bounds = new math.Rectangle(0, 0, 1, 1);

    /**
     * The most up-to-date bounds of the object
     *
     * @member {Rectangle}
     * @private
     */
    this._currentBounds = null;

    /**
     * The original, cached mask of the object
     *
     * @member {Rectangle}
     * @private
     */
    this._mask = null;

    //TODO rename to _isMask
   // this.isMask = false;

    /**
     * Cached internal flag.
     *
     * @member {boolean}
     * @private
     */
    this._cacheAsBitmap = false;
    this._cachedObject = null;
}

// constructor
DisplayObject.prototype = Object.create(EventEmitter.prototype);
DisplayObject.prototype.constructor = DisplayObject;
module.exports = DisplayObject;

Object.defineProperties(DisplayObject.prototype, {
    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     * @memberof DisplayObject#
     */
    x: {
        get: function ()
        {
            return this.position.x;
        },
        set: function (value)
        {
            this.position.x = value;
        }
    },

    /**
     * The position of the displayObject on the y axis relative to the local coordinates of the parent.
     *
     * @member {number}
     * @memberof DisplayObject#
     */
    y: {
        get: function ()
        {
            return this.position.y;
        },
        set: function (value)
        {
            this.position.y = value;
        }
    },

    /**
     * Indicates if the sprite is globally visible.
     *
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     * @readonly
     */
    worldVisible: {
        get: function ()
        {
            var item = this;

            do {
                if (!item.visible)
                {
                    return false;
                }

                item = item.parent;
            } while (item);

            return true;
        }
    },

    /**
     * Sets a mask for the displayObject. A mask is an object that limits the visibility of an object to the shape of the mask applied to it.
     * In PIXI a regular mask must be a PIXI.Graphics object. This allows for much faster masking in canvas as it utilises shape clipping.
     * To remove a mask, set this property to null.
     *
     * @member {Graphics}
     * @memberof PIXI.DisplayObject#
     */
    mask: {
        get: function ()
        {
            return this._mask;
        },
        set: function (value)
        {
            if (this._mask)
            {
                this._mask.renderable = true;
            }

            this._mask = value;

            if (this._mask)
            {
                this._mask.renderable = false;
            }
        }
    },

    /**
     * Sets the filters for the displayObject.
     * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * To remove filters simply set this property to 'null'
     *
     * @member {Filter[]}
     * @memberof PIXI.DisplayObject#
     */
    filters: {
        get: function ()
        {
            return this._filters && this._filters.slice();
        },
        set: function (value)
        {
            this._filters = value && value.slice();
        }
    }

});

/*
 * Updates the object transform for rendering
 *
 * TODO - Optimization pass!
 */
DisplayObject.prototype.updateTransform = function ()
{

    // create some matrix refs for easy access
    var pt = this.parent.worldTransform;
    var wt = this.worldTransform;

    // temporary matrix variables
    var a, b, c, d, tx, ty;

    // so if rotation is between 0 then we can simplify the multiplication process...
    if (this.rotation % CONST.PI_2)
    {
        // check to see if the rotation is the same as the previous render. This means we only need to use sin and cos when rotation actually changes
        if (this.rotation !== this.rotationCache)
        {
            this.rotationCache = this.rotation;
            this._sr = Math.sin(this.rotation);
            this._cr = Math.cos(this.rotation);
        }

        // get the matrix values of the displayobject based on its transform properties..
        a  =  this._cr * this.scale.x;
        b  =  this._sr * this.scale.x;
        c  = -this._sr * this.scale.y;
        d  =  this._cr * this.scale.y;
        tx =  this.position.x;
        ty =  this.position.y;

        // check for pivot.. not often used so geared towards that fact!
        if (this.pivot.x || this.pivot.y)
        {
            tx -= this.pivot.x * a + this.pivot.y * c;
            ty -= this.pivot.x * b + this.pivot.y * d;
        }

        // concat the parent matrix with the objects transform.
        wt.a  = a  * pt.a + b  * pt.c;
        wt.b  = a  * pt.b + b  * pt.d;
        wt.c  = c  * pt.a + d  * pt.c;
        wt.d  = c  * pt.b + d  * pt.d;
        wt.tx = tx * pt.a + ty * pt.c + pt.tx;
        wt.ty = tx * pt.b + ty * pt.d + pt.ty;
    }
    else
    {
        // lets do the fast version as we know there is no rotation..
        a  = this.scale.x;
        d  = this.scale.y;

        tx = this.position.x - this.pivot.x * a;
        ty = this.position.y - this.pivot.y * d;

        wt.a  = a  * pt.a;
        wt.b  = a  * pt.b;
        wt.c  = d  * pt.c;
        wt.d  = d  * pt.d;
        wt.tx = tx * pt.a + ty * pt.c + pt.tx;
        wt.ty = tx * pt.b + ty * pt.d + pt.ty;
    }

    // multiply the alphas..
    this.worldAlpha = this.alpha * this.parent.worldAlpha;

    // reset the bounds each time this is called!
    this._currentBounds = null;
};

// performance increase to avoid using call.. (10x faster)
DisplayObject.prototype.displayObjectUpdateTransform = DisplayObject.prototype.updateTransform;

/**
 *
 *
 * Retrieves the bounds of the displayObject as a rectangle object
 *
 * @param matrix {Matrix}
 * @return {Rectangle} the rectangular bounding area
 */
DisplayObject.prototype.getBounds = function (matrix) // jshint unused:false
{
    return math.Rectangle.EMPTY;
};

/**
 * Retrieves the local bounds of the displayObject as a rectangle object
 *
 * @return {Rectangle} the rectangular bounding area
 */
DisplayObject.prototype.getLocalBounds = function ()
{
    return this.getBounds(math.Matrix.IDENTITY);
};

/**
 * Calculates the global position of the display object
 *
 * @param position {Point} The world origin to calculate from
 * @return {Point} A point object representing the position of this object
 */
DisplayObject.prototype.toGlobal = function (position)
{
    // don't need to update the lot
    this.displayObjectUpdateTransform();
    return this.worldTransform.apply(position);
};

/**
 * Calculates the local position of the display object relative to another point
 *
 * @param position {Point} The world origin to calculate from
 * @param [from] {DisplayObject} The DisplayObject to calculate the global position from
 * @return {Point} A point object representing the position of this object
 */
DisplayObject.prototype.toLocal = function (position, from)
{
    if (from)
    {
        position = from.toGlobal(position);
    }

    // don't need to update the lot
    this.displayObjectUpdateTransform();
    return this.worldTransform.applyInverse(position);
};

/**
 * Renders the object using the WebGL renderer
 *
 * @param renderer {WebGLRenderer} The renderer
 * @private
 */
DisplayObject.prototype.renderWebGL = function (renderer) // jshint unused:false
{
    // OVERWRITE;
};

/**
 * Renders the object using the Canvas renderer
 *
 * @param renderer {CanvasRenderer} The renderer
 * @private
 */
DisplayObject.prototype.renderCanvas = function (renderer) // jshint unused:false
{
    // OVERWRITE;
};
/**
 * Useful function that returns a texture of the display object that can then be used to create sprites
 * This can be quite useful if your displayObject is static / complicated and needs to be reused multiple times.
 *
 * @param renderer {CanvasRenderer|WebGLRenderer} The renderer used to generate the texture.
 * @param scaleMode {Number} See {@link SCALE_MODES} for possible values
 * @param resolution {Number} The resolution of the texture being generated
 * @return {Texture} a texture of the display object
 */
DisplayObject.prototype.generateTexture = function (renderer, scaleMode, resolution)
{
    var bounds = this.getLocalBounds();

    var renderTexture = new RenderTexture(renderer, bounds.width | 0, bounds.height | 0, scaleMode, resolution);

    _tempMatrix.tx = -bounds.x;
    _tempMatrix.ty = -bounds.y;

    renderTexture.render(this, _tempMatrix);

    return renderTexture;
};

/**
 * Base destroy method for generic display objects
 *
 */
DisplayObject.prototype.destroy = function ()
{

    this.position = null;
    this.scale = null;
    this.pivot = null;

    this.parent = null;

    this._bounds = null;
    this._currentBounds = null;
    this._mask = null;

    this.worldTransform = null;
    this.filterArea = null;
};

},{"../const":6,"../math":12,"../textures/RenderTexture":40,"eventemitter3":3}],9:[function(require,module,exports){
/**
 * @file        Main export of the PIXI core library
 * @author      Mat Groves <mat@goodboydigital.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI
 */
// export core and const. We assign core to const so that the non-reference types in const remain in-tact
var core = module.exports = Object.assign(require('./const'), require('./math'), {
    // utils
    utils: require('./utils'),
    ticker: require('./ticker'),

    // display
    DisplayObject:          require('./display/DisplayObject'),
    Container:              require('./display/Container'),

    // sprites
    Sprite:                 require('./sprites/Sprite'),
    //ParticleContainer:      require('./particles/ParticleContainer'),
    SpriteRenderer:         require('./sprites/webgl/SpriteRenderer'),
    //ParticleRenderer:       require('./particles/webgl/ParticleRenderer'),

    // text
    //Text:                   require('./text/Text'),

    // primitives
    //Graphics:               require('./graphics/Graphics'),
    //GraphicsData:           require('./graphics/GraphicsData'),
    //GraphicsRenderer:       require('./graphics/webgl/GraphicsRenderer'),

    // textures
    Texture:                require('./textures/Texture'),
    BaseTexture:            require('./textures/BaseTexture'),
    //RenderTexture:          require('./textures/RenderTexture'),
    //VideoBaseTexture:       require('./textures/VideoBaseTexture'),
    TextureUvs:             require('./textures/TextureUvs'),

    // renderers - canvas
    CanvasRenderer:         require('./renderers/canvas/CanvasRenderer'),
    CanvasGraphics:         require('./renderers/canvas/utils/CanvasGraphics'),
    CanvasBuffer:           require('./renderers/canvas/utils/CanvasBuffer'),

    // renderers - webgl
    //WebGLRenderer:          require('./renderers/webgl/WebGLRenderer'),
    //ShaderManager:          require('./renderers/webgl/managers/ShaderManager'),
    //Shader:                 require('./renderers/webgl/shaders/Shader'),
    //ObjectRenderer:         require('./renderers/webgl/utils/ObjectRenderer'),
    //RenderTarget:           require('./renderers/webgl/utils/RenderTarget'),

    // filters - webgl
    //AbstractFilter:         require('./renderers/webgl/filters/AbstractFilter'),
    //FXAAFilter:             require('./renderers/webgl/filters/FXAAFilter'),
    //SpriteMaskFilter:       require('./renderers/webgl/filters/SpriteMaskFilter'),

    /**
     * This helper function will automatically detect which renderer you should be using.
     * WebGL is the preferred renderer as it is a lot faster. If webGL is not supported by
     * the browser then this function will return a canvas renderer
     *
     * @memberof PIXI
     * @param width=800 {number} the width of the renderers view
     * @param height=600 {number} the height of the renderers view
     * @param [options] {object} The optional renderer parameters
     * @param [options.view] {HTMLCanvasElement} the canvas to use as a view, optional
     * @param [options.transparent=false] {boolean} If the render view is transparent, default false
     * @param [options.antialias=false] {boolean} sets antialias (only applicable in chrome at the moment)
     * @param [options.preserveDrawingBuffer=false] {boolean} enables drawing buffer preservation, enable this if you
     *      need to call toDataUrl on the webgl context
     * @param [options.resolution=1] {number} the resolution of the renderer, retina would be 2
     * @param [noWebGL=false] {boolean} prevents selection of WebGL renderer, even if such is present
     *
     * @return {WebGLRenderer|CanvasRenderer} Returns WebGL renderer if available, otherwise CanvasRenderer
     */
    //autoDetectRenderer: function (width, height, options, noWebGL)
    //{
    //    width = width || 800;
    //    height = height || 600;

    //    if (!noWebGL && core.utils.isWebGLSupported())
    //    {
    //        return new core.WebGLRenderer(width, height, options);
    //    }

    //    return new core.CanvasRenderer(width, height, options);
    //}
});

},{"./const":6,"./display/Container":7,"./display/DisplayObject":8,"./math":12,"./renderers/canvas/CanvasRenderer":14,"./renderers/canvas/utils/CanvasBuffer":15,"./renderers/canvas/utils/CanvasGraphics":16,"./sprites/Sprite":37,"./sprites/webgl/SpriteRenderer":38,"./textures/BaseTexture":39,"./textures/Texture":41,"./textures/TextureUvs":42,"./ticker":45,"./utils":46}],10:[function(require,module,exports){
var Point = require('./Point');

/**
 * The pixi Matrix class as an object, which makes it a lot faster,
 * here is a representation of it :
 * | a | b | tx|
 * | c | d | ty|
 * | 0 | 0 | 1 |
 *
 * @class
 * @memberof PIXI
 */
function Matrix()
{
    /**
     * @member {number}
     * @default 1
     */
    this.a = 1;

    /**
     * @member {number}
     * @default 0
     */
    this.b = 0;

    /**
     * @member {number}
     * @default 0
     */
    this.c = 0;

    /**
     * @member {number}
     * @default 1
     */
    this.d = 1;

    /**
     * @member {number}
     * @default 0
     */
    this.tx = 0;

    /**
     * @member {number}
     * @default 0
     */
    this.ty = 0;
}

Matrix.prototype.constructor = Matrix;
module.exports = Matrix;

/**
 * Creates a Matrix object based on the given array. The Element to Matrix mapping order is as follows:
 *
 * a = array[0]
 * b = array[1]
 * c = array[3]
 * d = array[4]
 * tx = array[2]
 * ty = array[5]
 *
 * @param array {number[]} The array that the matrix will be populated from.
 */
Matrix.prototype.fromArray = function (array)
{
    this.a = array[0];
    this.b = array[1];
    this.c = array[3];
    this.d = array[4];
    this.tx = array[2];
    this.ty = array[5];
};

/**
 * Creates an array from the current Matrix object.
 *
 * @param transpose {boolean} Whether we need to transpose the matrix or not
 * @return {number[]} the newly created array which contains the matrix
 */
Matrix.prototype.toArray = function (transpose, out)
{
    if (!this.array)
    {
        this.array = new Float32Array(9);
    }

    var array = out || this.array;

    if (transpose)
    {
        array[0] = this.a;
        array[1] = this.b;
        array[2] = 0;
        array[3] = this.c;
        array[4] = this.d;
        array[5] = 0;
        array[6] = this.tx;
        array[7] = this.ty;
        array[8] = 1;
    }
    else
    {
        array[0] = this.a;
        array[1] = this.c;
        array[2] = this.tx;
        array[3] = this.b;
        array[4] = this.d;
        array[5] = this.ty;
        array[6] = 0;
        array[7] = 0;
        array[8] = 1;
    }

    return array;
};

/**
 * Get a new position with the current transformation applied.
 * Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
 *
 * @param pos {Point} The origin
 * @param [newPos] {Point} The point that the new position is assigned to (allowed to be same as input)
 * @return {Point} The new point, transformed through this matrix
 */
Matrix.prototype.apply = function (pos, newPos)
{
    newPos = newPos || new Point();

    var x = pos.x;
    var y = pos.y;

    newPos.x = this.a * x + this.c * y + this.tx;
    newPos.y = this.b * x + this.d * y + this.ty;

    return newPos;
};

/**
 * Get a new position with the inverse of the current transformation applied.
 * Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
 *
 * @param pos {Point} The origin
 * @param [newPos] {Point} The point that the new position is assigned to (allowed to be same as input)
 * @return {Point} The new point, inverse-transformed through this matrix
 */
Matrix.prototype.applyInverse = function (pos, newPos)
{
    newPos = newPos || new Point();

    var id = 1 / (this.a * this.d + this.c * -this.b);

    var x = pos.x;
    var y = pos.y;

    newPos.x = this.d * id * x + -this.c * id * y + (this.ty * this.c - this.tx * this.d) * id;
    newPos.y = this.a * id * y + -this.b * id * x + (-this.ty * this.a + this.tx * this.b) * id;

    return newPos;
};

/**
 * Translates the matrix on the x and y.
 *
 * @param {number} x
 * @param {number} y
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.translate = function (x, y)
{
    this.tx += x;
    this.ty += y;

    return this;
};

/**
 * Applies a scale transformation to the matrix.
 *
 * @param {number} x The amount to scale horizontally
 * @param {number} y The amount to scale vertically
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.scale = function (x, y)
{
    this.a *= x;
    this.d *= y;
    this.c *= x;
    this.b *= y;
    this.tx *= x;
    this.ty *= y;

    return this;
};


/**
 * Applies a rotation transformation to the matrix.
 *
 * @param {number} angle - The angle in radians.
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.rotate = function (angle)
{
    var cos = Math.cos( angle );
    var sin = Math.sin( angle );

    var a1 = this.a;
    var c1 = this.c;
    var tx1 = this.tx;

    this.a = a1 * cos-this.b * sin;
    this.b = a1 * sin+this.b * cos;
    this.c = c1 * cos-this.d * sin;
    this.d = c1 * sin+this.d * cos;
    this.tx = tx1 * cos - this.ty * sin;
    this.ty = tx1 * sin + this.ty * cos;

    return this;
};

/**
 * Appends the given Matrix to this Matrix.
 *
 * @param {Matrix} matrix
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.append = function (matrix)
{
    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;

    this.a  = matrix.a * a1 + matrix.b * c1;
    this.b  = matrix.a * b1 + matrix.b * d1;
    this.c  = matrix.c * a1 + matrix.d * c1;
    this.d  = matrix.c * b1 + matrix.d * d1;

    this.tx = matrix.tx * a1 + matrix.ty * c1 + this.tx;
    this.ty = matrix.tx * b1 + matrix.ty * d1 + this.ty;

    return this;
};

/**
 * Prepends the given Matrix to this Matrix.
 *
 * @param {Matrix} matrix
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.prepend = function(matrix)
{
    var tx1 = this.tx;

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1)
    {
        var a1 = this.a;
        var c1 = this.c;
        this.a  = a1*matrix.a+this.b*matrix.c;
        this.b  = a1*matrix.b+this.b*matrix.d;
        this.c  = c1*matrix.a+this.d*matrix.c;
        this.d  = c1*matrix.b+this.d*matrix.d;
    }

    this.tx = tx1*matrix.a+this.ty*matrix.c+matrix.tx;
    this.ty = tx1*matrix.b+this.ty*matrix.d+matrix.ty;

    return this;
};

/**
 * Inverts this matrix
 *
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.invert = function()
{
    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;
    var tx1 = this.tx;
    var n = a1*d1-b1*c1;

    this.a = d1/n;
    this.b = -b1/n;
    this.c = -c1/n;
    this.d = a1/n;
    this.tx = (c1*this.ty-d1*tx1)/n;
    this.ty = -(a1*this.ty-b1*tx1)/n;

    return this;
};


/**
 * Resets this Matix to an identity (default) matrix.
 *
 * @return {Matrix} This matrix. Good for chaining method calls.
 */
Matrix.prototype.identity = function ()
{
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;

    return this;
};

/**
 * Creates a new Matrix object with the same values as this one.
 *
 * @return {Matrix} A copy of this matrix. Good for chaining method calls.
 */
Matrix.prototype.clone = function ()
{
    var matrix = new Matrix();
    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
};

/**
 * Changes the values of the given matrix to be the same as the ones in this matrix
 *
 * @return {Matrix} The matrix given in parameter with its values updated.
 */
Matrix.prototype.copy = function (matrix)
{
    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
};

/**
 * A default (identity) matrix
 */
Matrix.IDENTITY = new Matrix();
/**
 * A temp matrix
 */
Matrix.TEMP_MATRIX = new Matrix();

},{"./Point":11}],11:[function(require,module,exports){
/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 *
 * @class
 * @memberof PIXI
 * @param [x=0] {number} position of the point on the x axis
 * @param [y=0] {number} position of the point on the y axis
 */
function Point(x, y)
{
    /**
     * @member {number}
     * @default 0
     */
    this.x = x || 0;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y || 0;
}

Point.prototype.constructor = Point;
module.exports = Point;

/**
 * Creates a clone of this point
 *
 * @return {Point} a copy of the point
 */
Point.prototype.clone = function ()
{
    return new Point(this.x, this.y);
};

/**
 * Copies x and y from the given point
 *
 * @param p {Point}
 */
Point.prototype.copy = function (p) {
    this.set(p.x, p.y);
};

/**
 * Returns true if the given point is equal to this point
 *
 * @param p {Point}
 * @returns {boolean}
 */
Point.prototype.equals = function (p) {
    return (p.x === this.x) && (p.y === this.y);
};

/**
 * Sets the point to a new x and y position.
 * If y is omitted, both x and y will be set to x.
 *
 * @param [x=0] {number} position of the point on the x axis
 * @param [y=0] {number} position of the point on the y axis
 */
Point.prototype.set = function (x, y)
{
    this.x = x || 0;
    this.y = y || ( (y !== 0) ? this.x : 0 ) ;
};

},{}],12:[function(require,module,exports){
/**
 * Math classes and utilities mixed into PIXI namespace.
 *
 * @lends PIXI
 */
module.exports = {
    // These will be mixed to be made publicly available,
    // while this module is used internally in core
    // to avoid circular dependencies and cut down on
    // internal module requires.

    Point:      require('./Point'),
    Matrix:     require('./Matrix'),

    //Circle:     require('./shapes/Circle'),
    //Ellipse:    require('./shapes/Ellipse'),
    //Polygon:    require('./shapes/Polygon'),
    //Rectangle:  require('./shapes/Rectangle'),
    //RoundedRectangle: require('./shapes/RoundedRectangle')
};

},{"./Matrix":10,"./Point":11}],13:[function(require,module,exports){
var utils = require('../utils'),
    math = require('../math'),
    CONST = require('../const'),
    EventEmitter = require('eventemitter3');

/**
 * The CanvasRenderer draws the scene and all its content onto a 2d canvas. This renderer should be used for browsers that do not support webGL.
 * Don't forget to add the CanvasRenderer.view to your DOM or you will not see anything :)
 *
 * @class
 * @memberof PIXI
 * @param system {string} The name of the system this renderer is for.
 * @param [width=800] {number} the width of the canvas view
 * @param [height=600] {number} the height of the canvas view
 * @param [options] {object} The optional renderer parameters
 * @param [options.view] {HTMLCanvasElement} the canvas to use as a view, optional
 * @param [options.transparent=false] {boolean} If the render view is transparent, default false
 * @param [options.autoResize=false] {boolean} If the render view is automatically resized, default false
 * @param [options.antialias=false] {boolean} sets antialias (only applicable in chrome at the moment)
 * @param [options.resolution=1] {number} the resolution of the renderer retina would be 2
 * @param [options.clearBeforeRender=true] {boolean} This sets if the CanvasRenderer will clear the canvas or
 *      not before the new render pass.
 */
function SystemRenderer(system, width, height, options)
{
    EventEmitter.call(this);

    utils.sayHello(system);

    // prepare options
    if (options)
    {
        for (var i in CONST.DEFAULT_RENDER_OPTIONS)
        {
            if (typeof options[i] === 'undefined')
            {
                options[i] = CONST.DEFAULT_RENDER_OPTIONS[i];
            }
        }
    }
    else
    {
        options = CONST.DEFAULT_RENDER_OPTIONS;
    }

    /**
     * The type of the renderer.
     *
     * @member {RENDERER_TYPE}
     * @default CONT.RENDERER_TYPE.UNKNOWN
     */
    this.type = CONST.RENDERER_TYPE.UNKNOWN;

    /**
     * The width of the canvas view
     *
     * @member {number}
     * @default 800
     */
    this.width = width || 800;

    /**
     * The height of the canvas view
     *
     * @member {number}
     * @default 600
     */
    this.height = height || 600;

    /**
     * The canvas element that everything is drawn to
     *
     * @member {HTMLCanvasElement}
     */
    this.view = options.view || document.createElement('canvas');

    /**
     * The resolution of the renderer
     *
     * @member {number}
     * @default 1
     */
    this.resolution = options.resolution;

    /**
     * Whether the render view is transparent
     *
     * @member {boolean}
     */
    this.transparent = options.transparent;

    /**
     * Whether the render view should be resized automatically
     *
     * @member {boolean}
     */
    this.autoResize = options.autoResize || false;

    /**
     * Tracks the blend modes useful for this renderer.
     *
     * @member {object<string, mixed>}
     */
    this.blendModes = null;

    /**
     * The value of the preserveDrawingBuffer flag affects whether or not the contents of the stencil buffer is retained after rendering.
     *
     * @member {boolean}
     */
    this.preserveDrawingBuffer = options.preserveDrawingBuffer;

    /**
     * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
     * If the scene is NOT transparent Pixi will use a canvas sized fillRect operation every frame to set the canvas background color.
     * If the scene is transparent Pixi will use clearRect to clear the canvas every frame.
     * Disable this by setting this to false. For example if your game has a canvas filling background image you often don't need this set.
     *
     * @member {boolean}
     * @default
     */
    this.clearBeforeRender = options.clearBeforeRender;

    /**
     * The background color as a number.
     *
     * @member {number}
     * @private
     */
    this._backgroundColor = 0x000000;

    /**
     * The background color as an [R, G, B] array.
     *
     * @member {number[]}
     * @private
     */
    this._backgroundColorRgb = [0, 0, 0];

    /**
     * The background color as a string.
     *
     * @member {string}
     * @private
     */
    this._backgroundColorString = '#000000';

    this.backgroundColor = options.backgroundColor || this._backgroundColor; // run bg color setter

    /**
     * This temporary display object used as the parent of the currently being rendered item
     * @member {DisplayObject}
     * @private
     */
    this._tempDisplayObjectParent = {worldTransform:new math.Matrix(), worldAlpha:1, children:[]};

    //
    this._lastObjectRendered = this._tempDisplayObjectParent;
}

// constructor
SystemRenderer.prototype = Object.create(EventEmitter.prototype);
SystemRenderer.prototype.constructor = SystemRenderer;
module.exports = SystemRenderer;

Object.defineProperties(SystemRenderer.prototype, {
    /**
     * The background color to fill if not transparent
     *
     * @member {number}
     * @memberof SystemRenderer#
     */
    backgroundColor:
    {
        get: function ()
        {
            return this._backgroundColor;
        },
        set: function (val)
        {
            this._backgroundColor = val;
            this._backgroundColorString = utils.hex2string(val);
            utils.hex2rgb(val, this._backgroundColorRgb);
        }
    }
});

/**
 * Resizes the canvas view to the specified width and height
 *
 * @param width {number} the new width of the canvas view
 * @param height {number} the new height of the canvas view
 */
SystemRenderer.prototype.resize = function (width, height) {
    this.width = width * this.resolution;
    this.height = height * this.resolution;

    this.view.width = this.width;
    this.view.height = this.height;

    if (this.autoResize)
    {
        this.view.style.width = this.width / this.resolution + 'px';
        this.view.style.height = this.height / this.resolution + 'px';
    }
};

/**
 * Removes everything from the renderer and optionally removes the Canvas DOM element.
 *
 * @param [removeView=false] {boolean} Removes the Canvas element from the DOM.
 */
SystemRenderer.prototype.destroy = function (removeView) {
    if (removeView && this.view.parent)
    {
        this.view.parent.removeChild(this.view);
    }

    this.type = CONST.RENDERER_TYPE.UNKNOWN;

    this.width = 0;
    this.height = 0;

    this.view = null;

    this.resolution = 0;

    this.transparent = false;

    this.autoResize = false;

    this.blendModes = null;

    this.preserveDrawingBuffer = false;
    this.clearBeforeRender = false;

    this._backgroundColor = 0;
    this._backgroundColorRgb = null;
    this._backgroundColorString = null;
};

},{"../const":6,"../math":12,"../utils":46,"eventemitter3":3}],14:[function(require,module,exports){
var SystemRenderer = require('../SystemRenderer'),
    CanvasMaskManager = require('./utils/CanvasMaskManager'),
    utils = require('../../utils'),
    math = require('../../math'),
    CONST = require('../../const');

/**
 * The CanvasRenderer draws the scene and all its content onto a 2d canvas. This renderer should be used for browsers that do not support webGL.
 * Don't forget to add the CanvasRenderer.view to your DOM or you will not see anything :)
 *
 * @class
 * @memberof PIXI
 * @extends PIXI.SystemRenderer
 * @param [width=800] {number} the width of the canvas view
 * @param [height=600] {number} the height of the canvas view
 * @param [options] {object} The optional renderer parameters
 * @param [options.view] {HTMLCanvasElement} the canvas to use as a view, optional
 * @param [options.transparent=false] {boolean} If the render view is transparent, default false
 * @param [options.autoResize=false] {boolean} If the render view is automatically resized, default false
 * @param [options.antialias=false] {boolean} sets antialias (only applicable in chrome at the moment)
 * @param [options.resolution=1] {number} the resolution of the renderer retina would be 2
 * @param [options.clearBeforeRender=true] {boolean} This sets if the CanvasRenderer will clear the canvas or
 *      not before the new render pass.
 */
function CanvasRenderer(width, height, options)
{
    SystemRenderer.call(this, 'Canvas', width, height, options);

    this.type = CONST.RENDERER_TYPE.CANVAS;

    /**
     * The canvas 2d context that everything is drawn with.
     *
     * @member {CanvasRenderingContext2D}
     */
    this.context = this.view.getContext('2d', { alpha: this.transparent });

    /**
     * Boolean flag controlling canvas refresh.
     *
     * @member {boolean}
     */
    this.refresh = true;

    /**
     * Instance of a CanvasMaskManager, handles masking when using the canvas renderer.
     *
     * @member {CanvasMaskManager}
     */
    this.maskManager = new CanvasMaskManager();

    /**
     * If true Pixi will Math.floor() x/y values when rendering, stopping pixel interpolation.
     * Handy for crisp pixel art and speed on legacy devices.
     *
     * @member {boolean}
     */
    this.roundPixels = false;

    /**
     * Tracks the active scale mode for this renderer.
     *
     * @member {SCALE_MODE}
     */
    this.currentScaleMode = CONST.SCALE_MODES.DEFAULT;

    /**
     * Tracks the active blend mode for this renderer.
     *
     * @member {SCALE_MODE}
     */
    this.currentBlendMode = CONST.BLEND_MODES.NORMAL;

    /**
     * The canvas property used to set the canvas smoothing property.
     *
     * @member {string}
     */
    this.smoothProperty = 'imageSmoothingEnabled';

    if (!this.context.imageSmoothingEnabled)
    {
        if (this.context.webkitImageSmoothingEnabled)
        {
            this.smoothProperty = 'webkitImageSmoothingEnabled';
        }
        else if (this.context.mozImageSmoothingEnabled)
        {
            this.smoothProperty = 'mozImageSmoothingEnabled';
        }
        else if (this.context.oImageSmoothingEnabled)
        {
            this.smoothProperty = 'oImageSmoothingEnabled';
        }
        else if (this.context.msImageSmoothingEnabled)
        {
            this.smoothProperty = 'msImageSmoothingEnabled';
        }
    }

    this.initPlugins();

    this._mapBlendModes();

    /**
     * This temporary display object used as the parent of the currently being rendered item
     *
     * @member {DisplayObject}
     * @private
     */
    this._tempDisplayObjectParent = {
        worldTransform: new math.Matrix(),
        worldAlpha: 1
    };


    this.resize(width, height);
}

// constructor
CanvasRenderer.prototype = Object.create(SystemRenderer.prototype);
CanvasRenderer.prototype.constructor = CanvasRenderer;
module.exports = CanvasRenderer;
utils.pluginTarget.mixin(CanvasRenderer);

/**
 * Renders the object to this canvas view
 *
 * @param object {DisplayObject} the object to be rendered
 */
CanvasRenderer.prototype.render = function (object)
{
    var cacheParent = object.parent;

    this._lastObjectRendered = object;

    object.parent = this._tempDisplayObjectParent;

    // update the scene graph
    object.updateTransform();

    object.parent = cacheParent;

    this.context.setTransform(1, 0, 0, 1, 0, 0);

    this.context.globalAlpha = 1;

    this.currentBlendMode = CONST.BLEND_MODES.NORMAL;
    this.context.globalCompositeOperation = this.blendModes[CONST.BLEND_MODES.NORMAL];

    if (navigator.isCocoonJS && this.view.screencanvas)
    {
        this.context.fillStyle = 'black';
        this.context.clear();
    }

    if (this.clearBeforeRender)
    {
        if (this.transparent)
        {
            this.context.clearRect(0, 0, this.width, this.height);
        }
        else
        {
            this.context.fillStyle = this._backgroundColorString;
            this.context.fillRect(0, 0, this.width , this.height);
        }
    }

    this.renderDisplayObject(object, this.context);
};

/**
 * Removes everything from the renderer and optionally removes the Canvas DOM element.
 *
 * @param [removeView=false] {boolean} Removes the Canvas element from the DOM.
 */
CanvasRenderer.prototype.destroy = function (removeView)
{
    this.destroyPlugins();

    // call the base destroy
    SystemRenderer.prototype.destroy.call(this, removeView);

    this.context = null;

    this.refresh = true;

    this.maskManager.destroy();
    this.maskManager = null;

    this.roundPixels = false;

    this.currentScaleMode = 0;
    this.currentBlendMode = 0;

    this.smoothProperty = null;
};

/**
 * Renders a display object
 *
 * @param displayObject {DisplayObject} The displayObject to render
 * @private
 */
CanvasRenderer.prototype.renderDisplayObject = function (displayObject, context)
{
    var tempContext = this.context;

    this.context = context;
    displayObject.renderCanvas(this);
    this.context = tempContext;
};

CanvasRenderer.prototype.resize = function (w, h)
{
    SystemRenderer.prototype.resize.call(this, w, h);

    //reset the scale mode.. oddly this seems to be reset when the canvas is resized.
    //surely a browser bug?? Let pixi fix that for you..
    this.currentScaleMode = CONST.SCALE_MODES.DEFAULT;
    
    if(this.smoothProperty)
    {
        this.context[this.smoothProperty] = (this.currentScaleMode === CONST.SCALE_MODES.LINEAR);
    }

};

/**
 * Maps Pixi blend modes to canvas blend modes.
 *
 * @private
 */
CanvasRenderer.prototype._mapBlendModes = function ()
{
    if (!this.blendModes)
    {
        this.blendModes = {};

        if (utils.canUseNewCanvasBlendModes())
        {
            this.blendModes[CONST.BLEND_MODES.NORMAL]        = 'source-over';
            this.blendModes[CONST.BLEND_MODES.ADD]           = 'lighter'; //IS THIS OK???
            this.blendModes[CONST.BLEND_MODES.MULTIPLY]      = 'multiply';
            this.blendModes[CONST.BLEND_MODES.SCREEN]        = 'screen';
            this.blendModes[CONST.BLEND_MODES.OVERLAY]       = 'overlay';
            this.blendModes[CONST.BLEND_MODES.DARKEN]        = 'darken';
            this.blendModes[CONST.BLEND_MODES.LIGHTEN]       = 'lighten';
            this.blendModes[CONST.BLEND_MODES.COLOR_DODGE]   = 'color-dodge';
            this.blendModes[CONST.BLEND_MODES.COLOR_BURN]    = 'color-burn';
            this.blendModes[CONST.BLEND_MODES.HARD_LIGHT]    = 'hard-light';
            this.blendModes[CONST.BLEND_MODES.SOFT_LIGHT]    = 'soft-light';
            this.blendModes[CONST.BLEND_MODES.DIFFERENCE]    = 'difference';
            this.blendModes[CONST.BLEND_MODES.EXCLUSION]     = 'exclusion';
            this.blendModes[CONST.BLEND_MODES.HUE]           = 'hue';
            this.blendModes[CONST.BLEND_MODES.SATURATION]    = 'saturate';
            this.blendModes[CONST.BLEND_MODES.COLOR]         = 'color';
            this.blendModes[CONST.BLEND_MODES.LUMINOSITY]    = 'luminosity';
        }
        else
        {
            // this means that the browser does not support the cool new blend modes in canvas 'cough' ie 'cough'
            this.blendModes[CONST.BLEND_MODES.NORMAL]        = 'source-over';
            this.blendModes[CONST.BLEND_MODES.ADD]           = 'lighter'; //IS THIS OK???
            this.blendModes[CONST.BLEND_MODES.MULTIPLY]      = 'source-over';
            this.blendModes[CONST.BLEND_MODES.SCREEN]        = 'source-over';
            this.blendModes[CONST.BLEND_MODES.OVERLAY]       = 'source-over';
            this.blendModes[CONST.BLEND_MODES.DARKEN]        = 'source-over';
            this.blendModes[CONST.BLEND_MODES.LIGHTEN]       = 'source-over';
            this.blendModes[CONST.BLEND_MODES.COLOR_DODGE]   = 'source-over';
            this.blendModes[CONST.BLEND_MODES.COLOR_BURN]    = 'source-over';
            this.blendModes[CONST.BLEND_MODES.HARD_LIGHT]    = 'source-over';
            this.blendModes[CONST.BLEND_MODES.SOFT_LIGHT]    = 'source-over';
            this.blendModes[CONST.BLEND_MODES.DIFFERENCE]    = 'source-over';
            this.blendModes[CONST.BLEND_MODES.EXCLUSION]     = 'source-over';
            this.blendModes[CONST.BLEND_MODES.HUE]           = 'source-over';
            this.blendModes[CONST.BLEND_MODES.SATURATION]    = 'source-over';
            this.blendModes[CONST.BLEND_MODES.COLOR]         = 'source-over';
            this.blendModes[CONST.BLEND_MODES.LUMINOSITY]    = 'source-over';
        }
    }
};

},{"../../const":6,"../../math":12,"../../utils":46,"../SystemRenderer":13,"./utils/CanvasMaskManager":17}],15:[function(require,module,exports){
/**
 * Creates a Canvas element of the given size.
 *
 * @class
 * @memberof PIXI
 * @param width {number} the width for the newly created canvas
 * @param height {number} the height for the newly created canvas
 */
function CanvasBuffer(width, height)
{
    /**
     * The Canvas object that belongs to this CanvasBuffer.
     *
     * @member {HTMLCanvasElement}
     */
    this.canvas = document.createElement('canvas');

    /**
     * A CanvasRenderingContext2D object representing a two-dimensional rendering context.
     *
     * @member {CanvasRenderingContext2D}
     */
    this.context = this.canvas.getContext('2d');

    this.canvas.width = width;
    this.canvas.height = height;
}

CanvasBuffer.prototype.constructor = CanvasBuffer;
module.exports = CanvasBuffer;

Object.defineProperties(CanvasBuffer.prototype, {
    /**
     * The width of the canvas buffer in pixels.
     *
     * @member {number}
     * @memberof CanvasBuffer#
     */
    width: {
        get: function ()
        {
            return this.canvas.width;
        },
        set: function (val)
        {
            this.canvas.width = val;
        }
    },
    /**
     * The height of the canvas buffer in pixels.
     *
     * @member {number}
     * @memberof CanvasBuffer#
     */
    height: {
        get: function ()
        {
            return this.canvas.height;
        },
        set: function (val)
        {
            this.canvas.height = val;
        }
    }
});

/**
 * Clears the canvas that was created by the CanvasBuffer class.
 *
 * @private
 */
CanvasBuffer.prototype.clear = function ()
{
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0,0, this.canvas.width, this.canvas.height);
};

/**
 * Resizes the canvas to the specified width and height.
 *
 * @param width {number} the new width of the canvas
 * @param height {number} the new height of the canvas
 */
CanvasBuffer.prototype.resize = function (width, height)
{
    this.canvas.width = width;
    this.canvas.height = height;
};

/**
 * Destroys this canvas.
 *
 */
CanvasBuffer.prototype.destroy = function ()
{
    this.context = null;
    this.canvas = null;
};

},{}],16:[function(require,module,exports){
var CONST = require('../../../const');

/**
 * A set of functions used by the canvas renderer to draw the primitive graphics data.
 * @static
 * @class
 * @memberof PIXI
 */
var CanvasGraphics = {};
module.exports = CanvasGraphics;

/*
 * Renders a Graphics object to a canvas.
 *
 * @param graphics {Graphics} the actual graphics object to render
 * @param context {CanvasRenderingContext2D} the 2d drawing method of the canvas
 */
CanvasGraphics.renderGraphics = function (graphics, context)
{
    var worldAlpha = graphics.worldAlpha;

    if (graphics.dirty)
    {
        this.updateGraphicsTint(graphics);
        graphics.dirty = false;
    }

    for (var i = 0; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];
        var shape = data.shape;

        var fillColor = data._fillTint;
        var lineColor = data._lineTint;

        context.lineWidth = data.lineWidth;

        if (data.type === CONST.SHAPES.POLY)
        {
            context.beginPath();

            var points = shape.points;

            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            if (shape.closed)
            {
                context.lineTo(points[0], points[1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if (points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

            if (data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = '#' + ('00000' + ( fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if (data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeStyle = '#' + ('00000' + ( lineColor | 0).toString(16)).substr(-6);
                context.stroke();
            }
        }
        else if (data.type === CONST.SHAPES.RECT)
        {

            if (data.fillColor || data.fillColor === 0)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = '#' + ('00000' + ( fillColor | 0).toString(16)).substr(-6);
                context.fillRect(shape.x, shape.y, shape.width, shape.height);

            }
            if (data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeStyle = '#' + ('00000' + ( lineColor | 0).toString(16)).substr(-6);
                context.strokeRect(shape.x, shape.y, shape.width, shape.height);
            }
        }
        else if (data.type === CONST.SHAPES.CIRC)
        {
            // TODO - need to be Undefined!
            context.beginPath();
            context.arc(shape.x, shape.y, shape.radius,0,2*Math.PI);
            context.closePath();

            if (data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = '#' + ('00000' + ( fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if (data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeStyle = '#' + ('00000' + ( lineColor | 0).toString(16)).substr(-6);
                context.stroke();
            }
        }
        else if (data.type === CONST.SHAPES.ELIP)
        {
            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas

            var w = shape.width * 2;
            var h = shape.height * 2;

            var x = shape.x - w/2;
            var y = shape.y - h/2;

            context.beginPath();

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

            context.closePath();

            if (data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = '#' + ('00000' + ( fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if (data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeStyle = '#' + ('00000' + ( lineColor | 0).toString(16)).substr(-6);
                context.stroke();
            }
        }
        else if (data.type === CONST.SHAPES.RREC)
        {
            var rx = shape.x;
            var ry = shape.y;
            var width = shape.width;
            var height = shape.height;
            var radius = shape.radius;

            var maxRadius = Math.min(width, height) / 2 | 0;
            radius = radius > maxRadius ? maxRadius : radius;

            context.beginPath();
            context.moveTo(rx, ry + radius);
            context.lineTo(rx, ry + height - radius);
            context.quadraticCurveTo(rx, ry + height, rx + radius, ry + height);
            context.lineTo(rx + width - radius, ry + height);
            context.quadraticCurveTo(rx + width, ry + height, rx + width, ry + height - radius);
            context.lineTo(rx + width, ry + radius);
            context.quadraticCurveTo(rx + width, ry, rx + width - radius, ry);
            context.lineTo(rx + radius, ry);
            context.quadraticCurveTo(rx, ry, rx, ry + radius);
            context.closePath();

            if (data.fillColor || data.fillColor === 0)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = '#' + ('00000' + ( fillColor | 0).toString(16)).substr(-6);
                context.fill();

            }
            if (data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeStyle = '#' + ('00000' + ( lineColor | 0).toString(16)).substr(-6);
                context.stroke();
            }
        }
    }
};

/*
 * Renders a graphics mask
 *
 * @private
 * @param graphics {Graphics} the graphics which will be used as a mask
 * @param context {CanvasRenderingContext2D} the context 2d method of the canvas
 */
CanvasGraphics.renderGraphicsMask = function (graphics, context)
{
    var len = graphics.graphicsData.length;

    if (len === 0)
    {
        return;
    }

    context.beginPath();

    for (var i = 0; i < len; i++)
    {
        var data = graphics.graphicsData[i];
        var shape = data.shape;

        if (data.type === CONST.SHAPES.POLY)
        {

            var points = shape.points;

            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if (points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

        }
        else if (data.type === CONST.SHAPES.RECT)
        {
            context.rect(shape.x, shape.y, shape.width, shape.height);
            context.closePath();
        }
        else if (data.type === CONST.SHAPES.CIRC)
        {
            // TODO - need to be Undefined!
            context.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
            context.closePath();
        }
        else if (data.type === CONST.SHAPES.ELIP)
        {

            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas

            var w = shape.width * 2;
            var h = shape.height * 2;

            var x = shape.x - w/2;
            var y = shape.y - h/2;

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
            context.closePath();
        }
        else if (data.type === CONST.SHAPES.RREC)
        {

            var rx = shape.x;
            var ry = shape.y;
            var width = shape.width;
            var height = shape.height;
            var radius = shape.radius;

            var maxRadius = Math.min(width, height) / 2 | 0;
            radius = radius > maxRadius ? maxRadius : radius;

            context.moveTo(rx, ry + radius);
            context.lineTo(rx, ry + height - radius);
            context.quadraticCurveTo(rx, ry + height, rx + radius, ry + height);
            context.lineTo(rx + width - radius, ry + height);
            context.quadraticCurveTo(rx + width, ry + height, rx + width, ry + height - radius);
            context.lineTo(rx + width, ry + radius);
            context.quadraticCurveTo(rx + width, ry, rx + width - radius, ry);
            context.lineTo(rx + radius, ry);
            context.quadraticCurveTo(rx, ry, rx, ry + radius);
            context.closePath();
        }
    }
};

/*
 * Updates the tint of a graphics object
 *
 * @private
 * @param graphics {Graphics} the graphics that will have its tint updated
 * 
 */
CanvasGraphics.updateGraphicsTint = function (graphics)
{
    if (graphics.tint === 0xFFFFFF)
    {
        return;
    }

    var tintR = (graphics.tint >> 16 & 0xFF) / 255;
    var tintG = (graphics.tint >> 8 & 0xFF) / 255;
    var tintB = (graphics.tint & 0xFF)/ 255;

    for (var i = 0; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];

        var fillColor = data.fillColor | 0;
        var lineColor = data.lineColor | 0;

        /*
        var colorR = (fillColor >> 16 & 0xFF) / 255;
        var colorG = (fillColor >> 8 & 0xFF) / 255;
        var colorB = (fillColor & 0xFF) / 255;

        colorR *= tintR;
        colorG *= tintG;
        colorB *= tintB;

        fillColor = ((colorR*255 << 16) + (colorG*255 << 8) + colorB*255);

        colorR = (lineColor >> 16 & 0xFF) / 255;
        colorG = (lineColor >> 8 & 0xFF) / 255;
        colorB = (lineColor & 0xFF) / 255;

        colorR *= tintR;
        colorG *= tintG;
        colorB *= tintB;

        lineColor = ((colorR*255 << 16) + (colorG*255 << 8) + colorB*255);
        */

        // super inline cos im an optimization NAZI :)
        data._fillTint = (((fillColor >> 16 & 0xFF) / 255 * tintR*255 << 16) + ((fillColor >> 8 & 0xFF) / 255 * tintG*255 << 8) +  (fillColor & 0xFF) / 255 * tintB*255);
        data._lineTint = (((lineColor >> 16 & 0xFF) / 255 * tintR*255 << 16) + ((lineColor >> 8 & 0xFF) / 255 * tintG*255 << 8) +  (lineColor & 0xFF) / 255 * tintB*255);

    }
};


},{"../../../const":6}],17:[function(require,module,exports){
var CanvasGraphics = require('./CanvasGraphics');

/**
 * A set of functions used to handle masking.
 *
 * @class
 * @memberof PIXI
 */
function CanvasMaskManager()
{}

CanvasMaskManager.prototype.constructor = CanvasMaskManager;
module.exports = CanvasMaskManager;

/**
 * This method adds it to the current stack of masks.
 *
 * @param maskData {object} the maskData that will be pushed
 * @param renderer {WebGLRenderer|CanvasRenderer} The renderer context to use.
 */
CanvasMaskManager.prototype.pushMask = function (maskData, renderer)
{

    renderer.context.save();

    var cacheAlpha = maskData.alpha;
    var transform = maskData.worldTransform;
    var resolution = renderer.resolution;

    renderer.context.setTransform(
        transform.a * resolution,
        transform.b * resolution,
        transform.c * resolution,
        transform.d * resolution,
        transform.tx * resolution,
        transform.ty * resolution
    );

    //TODO suport sprite alpha masks??
    //lots of effort required. If demand is great enough..
    if(!maskData.texture)
    {
        CanvasGraphics.renderGraphicsMask(maskData, renderer.context);
        renderer.context.clip();
    }

    maskData.worldAlpha = cacheAlpha;
};

/**
 * Restores the current drawing context to the state it was before the mask was applied.
 *
 * @param renderer {WebGLRenderer|CanvasRenderer} The renderer context to use.
 */
CanvasMaskManager.prototype.popMask = function (renderer)
{
    renderer.context.restore();
};

CanvasMaskManager.prototype.destroy = function () {};

},{"./CanvasGraphics":16}],18:[function(require,module,exports){
var utils = require('../../../utils');

/**
 * Utility methods for Sprite/Texture tinting.
 * @static
 * @class
 * @memberof PIXI
 */
var CanvasTinter = {};
module.exports = CanvasTinter;

/**
 * Basically this method just needs a sprite and a color and tints the sprite with the given color.
 *
 * @param sprite {Sprite} the sprite to tint
 * @param color {number} the color to use to tint the sprite with
 * @return {HTMLCanvasElement} The tinted canvas
 */
CanvasTinter.getTintedTexture = function (sprite, color)
{
    var texture = sprite.texture;

    color = CanvasTinter.roundColor(color);

    var stringColor = '#' + ('00000' + ( color | 0).toString(16)).substr(-6);

    texture.tintCache = texture.tintCache || {};

    if (texture.tintCache[stringColor])
    {
        return texture.tintCache[stringColor];
    }

     // clone texture..
    var canvas = CanvasTinter.canvas || document.createElement('canvas');

    //CanvasTinter.tintWithPerPixel(texture, stringColor, canvas);
    CanvasTinter.tintMethod(texture, color, canvas);

    if (CanvasTinter.convertTintToImage)
    {
        // is this better?
        var tintImage = new Image();
        tintImage.src = canvas.toDataURL();

        texture.tintCache[stringColor] = tintImage;
    }
    else
    {
        texture.tintCache[stringColor] = canvas;
        // if we are not converting the texture to an image then we need to lose the reference to the canvas
        CanvasTinter.canvas = null;
    }

    return canvas;
};

/**
 * Tint a texture using the 'multiply' operation.
 *
 * @param texture {Texture} the texture to tint
 * @param color {number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
CanvasTinter.tintWithMultiply = function (texture, color, canvas)
{
    var context = canvas.getContext( '2d' );

    var crop = texture.crop;

    canvas.width = crop.width;
    canvas.height = crop.height;

    context.fillStyle = '#' + ('00000' + ( color | 0).toString(16)).substr(-6);

    context.fillRect(0, 0, crop.width, crop.height);

    context.globalCompositeOperation = 'multiply';

    context.drawImage(
        texture.baseTexture.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    context.globalCompositeOperation = 'destination-atop';

    context.drawImage(
        texture.baseTexture.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );
};

/**
 * Tint a texture using the 'overlay' operation.
 *
 * @param texture {Texture} the texture to tint
 * @param color {number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
CanvasTinter.tintWithOverlay = function (texture, color, canvas)
{
    var context = canvas.getContext( '2d' );

    var crop = texture.crop;

    canvas.width = crop.width;
    canvas.height = crop.height;

    context.globalCompositeOperation = 'copy';
    context.fillStyle = '#' + ('00000' + ( color | 0).toString(16)).substr(-6);
    context.fillRect(0, 0, crop.width, crop.height);

    context.globalCompositeOperation = 'destination-atop';
    context.drawImage(
        texture.baseTexture.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    // context.globalCompositeOperation = 'copy';
};

/**
 * Tint a texture pixel per pixel.
 *
 * @param texture {Texture} the texture to tint
 * @param color {number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
CanvasTinter.tintWithPerPixel = function (texture, color, canvas)
{
    var context = canvas.getContext( '2d' );

    var crop = texture.crop;

    canvas.width = crop.width;
    canvas.height = crop.height;

    context.globalCompositeOperation = 'copy';
    context.drawImage(
        texture.baseTexture.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    var rgbValues = utils.hex2rgb(color);
    var r = rgbValues[0], g = rgbValues[1], b = rgbValues[2];

    var pixelData = context.getImageData(0, 0, crop.width, crop.height);

    var pixels = pixelData.data;

    for (var i = 0; i < pixels.length; i += 4)
    {
        pixels[i+0] *= r;
        pixels[i+1] *= g;
        pixels[i+2] *= b;
    }

    context.putImageData(pixelData, 0, 0);
};

/**
 * Rounds the specified color according to the CanvasTinter.cacheStepsPerColorChannel.
 *
 * @param color {number} the color to round, should be a hex color
 */
CanvasTinter.roundColor = function (color)
{
    var step = CanvasTinter.cacheStepsPerColorChannel;

    var rgbValues = utils.hex2rgb(color);

    rgbValues[0] = Math.min(255, (rgbValues[0] / step) * step);
    rgbValues[1] = Math.min(255, (rgbValues[1] / step) * step);
    rgbValues[2] = Math.min(255, (rgbValues[2] / step) * step);

    return utils.rgb2hex(rgbValues);
};

/**
 * Number of steps which will be used as a cap when rounding colors.
 *
 * @member
 */
CanvasTinter.cacheStepsPerColorChannel = 8;

/**
 * Tint cache boolean flag.
 *
 * @member
 */
CanvasTinter.convertTintToImage = false;

/**
 * Whether or not the Canvas BlendModes are supported, consequently the ability to tint using the multiply method.
 *
 * @member
 */
CanvasTinter.canUseMultiply = utils.canUseNewCanvasBlendModes();

/**
 * The tinting method that will be used.
 *
 */
CanvasTinter.tintMethod = CanvasTinter.canUseMultiply ? CanvasTinter.tintWithMultiply :  CanvasTinter.tintWithPerPixel;

},{"../../../utils":46}],19:[function(require,module,exports){
var SystemRenderer = require('../SystemRenderer'),
    ShaderManager = require('./managers/ShaderManager'),
    MaskManager = require('./managers/MaskManager'),
    StencilManager = require('./managers/StencilManager'),
    FilterManager = require('./managers/FilterManager'),
    BlendModeManager = require('./managers/BlendModeManager'),
    RenderTarget = require('./utils/RenderTarget'),
    ObjectRenderer = require('./utils/ObjectRenderer'),
    FXAAFilter = require('./filters/FXAAFilter'),
    utils = require('../../utils'),
    CONST = require('../../const');

/**
 * The WebGLRenderer draws the scene and all its content onto a webGL enabled canvas. This renderer
 * should be used for browsers that support webGL. This Render works by automatically managing webGLBatchs.
 * So no need for Sprite Batches or Sprite Clouds.
 * Don't forget to add the view to your DOM or you will not see anything :)
 *
 * @class
 * @memberof PIXI
 * @extends PIXI.SystemRenderer
 * @param [width=0] {number} the width of the canvas view
 * @param [height=0] {number} the height of the canvas view
 * @param [options] {object} The optional renderer parameters
 * @param [options.view] {HTMLCanvasElement} the canvas to use as a view, optional
 * @param [options.transparent=false] {boolean} If the render view is transparent, default false
 * @param [options.autoResize=false] {boolean} If the render view is automatically resized, default false
 * @param [options.antialias=false] {boolean} sets antialias. If not available natively then FXAA antialiasing is used
 * @param [options.forceFXAA=false] {boolean} forces FXAA antialiasing to be used over native. FXAA is faster, but may not always lok as great
 * @param [options.resolution=1] {number} the resolution of the renderer retina would be 2
 * @param [options.clearBeforeRender=true] {boolean} This sets if the CanvasRenderer will clear the canvas or
 *      not before the new render pass.
 * @param [options.preserveDrawingBuffer=false] {boolean} enables drawing buffer preservation, enable this if
 *      you need to call toDataUrl on the webgl context.
 */
function WebGLRenderer(width, height, options)
{
    options = options || {};

    SystemRenderer.call(this, 'WebGL', width, height, options);

    /**
     * The type of this renderer as a standardised const
     *
     * @member {number}
     *
     */
    this.type = CONST.RENDERER_TYPE.WEBGL;

    this.handleContextLost = this.handleContextLost.bind(this);
    this.handleContextRestored = this.handleContextRestored.bind(this);

    this.view.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.view.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    //TODO possibility to force FXAA as it may offer better performance?
    /**
     * Does it use FXAA ?
     *
     * @member {boolean}
     * @private
     */
    this._useFXAA = !!options.forceFXAA && options.antialias;

    /**
     * The fxaa filter
     *
     * @member {FXAAFilter}
     * @private
     */
    this._FXAAFilter = null;

    /**
     * The options passed in to create a new webgl context.
     *
     * @member {object}
     * @private
     */
    this._contextOptions = {
        alpha: this.transparent,
        antialias: options.antialias,
        premultipliedAlpha: this.transparent && this.transparent !== 'notMultiplied',
        stencil: true,
        preserveDrawingBuffer: options.preserveDrawingBuffer
    };

    /**
     * Counter for the number of draws made each frame
     *
     * @member {number}
     */
    this.drawCount = 0;

    /**
     * Deals with managing the shader programs and their attribs.
     *
     * @member {ShaderManager}
     */
    this.shaderManager = new ShaderManager(this);

    /**
     * Manages the masks using the stencil buffer.
     *
     * @member {MaskManager}
     */
    this.maskManager = new MaskManager(this);

    /**
     * Manages the stencil buffer.
     *
     * @member {StencilManager}
     */
    this.stencilManager = new StencilManager(this);

    /**
     * Manages the filters.
     *
     * @member {FilterManager}
     */
    this.filterManager = new FilterManager(this);


    /**
     * Manages the blendModes
     * @member {BlendModeManager}
     */
    this.blendModeManager = new BlendModeManager(this);

    /**
     * Holds the current render target
     * @member {Object}
     */
    this.currentRenderTarget = null;

    /**
     * object renderer @alvin
     * @member {ObjectRenderer}
     */
    this.currentRenderer = new ObjectRenderer(this);

    this.initPlugins();

    // initialize the context so it is ready for the managers.
    this._createContext();
    this._initContext();

    // map some webGL blend modes..
    this._mapGlModes();

    /**
     * An array of render targets
     * @member {Array}
     * @private
     */
    this._renderTargetStack = [];
}

// constructor
WebGLRenderer.prototype = Object.create(SystemRenderer.prototype);
WebGLRenderer.prototype.constructor = WebGLRenderer;
module.exports = WebGLRenderer;
utils.pluginTarget.mixin(WebGLRenderer);

WebGLRenderer.glContextId = 0;

WebGLRenderer.prototype._createContext = function () {
    var gl = this.view.getContext('webgl', this._contextOptions) || this.view.getContext('experimental-webgl', this._contextOptions);
    this.gl = gl;

    if (!gl)
    {
        // fail, not able to get a context
        throw new Error('This browser does not support webGL. Try using the canvas renderer');
    }

    this.glContextId = WebGLRenderer.glContextId++;
    gl.id = this.glContextId;
    gl.renderer = this;
};

/**
 * Creates the WebGL context
 * @private
 */
WebGLRenderer.prototype._initContext = function ()
{
    var gl = this.gl;

    // set up the default pixi settings..
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);

    this.renderTarget = new RenderTarget(gl, this.width, this.height, null, this.resolution, true);

    this.setRenderTarget(this.renderTarget);

    this.emit('context', gl);

    // setup the width/height properties and gl viewport
    this.resize(this.width, this.height);

    if(!this._useFXAA)
    {
        this._useFXAA = (this._contextOptions.antialias && ! gl.getContextAttributes().antialias);
    }


    if(this._useFXAA)
    {
        window.console.warn('FXAA antialiasing being used instead of native antialiasing');
        this._FXAAFilter = [new FXAAFilter()];
    }
};

/**
 * Renders the object to its webGL view
 *
 * @param object {DisplayObject} the object to be rendered
 */
WebGLRenderer.prototype.render = function (object)
{
    // no point rendering if our context has been blown up!
    if (this.gl.isContextLost())
    {
        return;
    }

    this.drawCount = 0;

    this._lastObjectRendered = object;

    if(this._useFXAA)
    {
        this._FXAAFilter[0].uniforms.resolution.value.x = this.width;
        this._FXAAFilter[0].uniforms.resolution.value.y = this.height;
        object.filterArea = this.renderTarget.size;
        object.filters = this._FXAAFilter;
    }

    var cacheParent = object.parent;
    object.parent = this._tempDisplayObjectParent;

    // update the scene graph
    object.updateTransform();

    object.parent = cacheParent;

    var gl = this.gl;

    // make sure we are bound to the main frame buffer
    this.setRenderTarget(this.renderTarget);

    if (this.clearBeforeRender)
    {
        if (this.transparent)
        {
            gl.clearColor(0, 0, 0, 0);
        }
        else
        {
            gl.clearColor(this._backgroundColorRgb[0], this._backgroundColorRgb[1], this._backgroundColorRgb[2], 1);
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    this.renderDisplayObject(object, this.renderTarget);//this.projection);
};

/**
 * Renders a Display Object.
 *
 * @param displayObject {DisplayObject} The DisplayObject to render
 * @param renderTarget {RenderTarget} The render target to use to render this display object
 *
 */
WebGLRenderer.prototype.renderDisplayObject = function (displayObject, renderTarget, clear)//projection, buffer)
{
    // TODO is this needed...
    //this.blendModeManager.setBlendMode(CONST.BLEND_MODES.NORMAL);
    this.setRenderTarget(renderTarget);

    if(clear)
    {
        renderTarget.clear();
    }

    // start the filter manager
    this.filterManager.setFilterStack( renderTarget.filterStack );

    // render the scene!
    displayObject.renderWebGL(this);

    // finish the current renderer..
    this.currentRenderer.flush();
};

/**
 * Changes the current renderer to the one given in parameter
 *
 * @param objectRenderer {Object} TODO @alvin
 *
 */
WebGLRenderer.prototype.setObjectRenderer = function (objectRenderer)
{
    if (this.currentRenderer === objectRenderer)
    {
        return;
    }

    this.currentRenderer.stop();
    this.currentRenderer = objectRenderer;
    this.currentRenderer.start();
};

/**
 * Changes the current render target to the one given in parameter
 *
 * @param renderTarget {RenderTarget} the new render target
 *
 */
WebGLRenderer.prototype.setRenderTarget = function (renderTarget)
{
    if( this.currentRenderTarget === renderTarget)
    {
        return;
    }
    // TODO - maybe down the line this should be a push pos thing? Leaving for now though.
    this.currentRenderTarget = renderTarget;
    this.currentRenderTarget.activate();
    this.stencilManager.setMaskStack( renderTarget.stencilMaskStack );
};


/**
 * Resizes the webGL view to the specified width and height.
 *
 * @param width {number} the new width of the webGL view
 * @param height {number} the new height of the webGL view
 */
WebGLRenderer.prototype.resize = function (width, height)
{
    SystemRenderer.prototype.resize.call(this, width, height);

    this.filterManager.resize(width, height);
    this.renderTarget.resize(width, height);

    if(this.currentRenderTarget === this.renderTarget)
    {
        this.renderTarget.activate();
        this.gl.viewport(0, 0, this.width, this.height);
    }
};

/**
 * Updates and/or Creates a WebGL texture for the renderer's context.
 *
 * @param texture {BaseTexture|Texture} the texture to update
 */
WebGLRenderer.prototype.updateTexture = function (texture)
{
    texture = texture.baseTexture || texture;

    if (!texture.hasLoaded)
    {
        return;
    }

    var gl = this.gl;

    if (!texture._glTextures[gl.id])
    {
        texture._glTextures[gl.id] = gl.createTexture();
        texture.on('update', this.updateTexture, this);
        texture.on('dispose', this.destroyTexture, this);
    }


    gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultipliedAlpha);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.scaleMode === CONST.SCALE_MODES.LINEAR ? gl.LINEAR : gl.NEAREST);


    if (texture.mipmap && texture.isPowerOfTwo)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === CONST.SCALE_MODES.LINEAR ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === CONST.SCALE_MODES.LINEAR ? gl.LINEAR : gl.NEAREST);
    }

    if (!texture.isPowerOfTwo)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    return  texture._glTextures[gl.id];
};

/**
 * Deletes the texture from WebGL
 *
 * @param texture {BaseTexture|Texture} the texture to destroy
 */
WebGLRenderer.prototype.destroyTexture = function (texture)
{
    texture = texture.baseTexture || texture;

    if (!texture.hasLoaded)
    {
        return;
    }

    if (texture._glTextures[this.gl.id])
    {
        this.gl.deleteTexture(texture._glTextures[this.gl.id]);
    }
};

/**
 * Handles a lost webgl context
 *
 * @param event {Event}
 * @private
 */
WebGLRenderer.prototype.handleContextLost = function (event)
{
    event.preventDefault();
};

/**
 * Handles a restored webgl context
 *
 * @param event {Event}
 * @private
 */
WebGLRenderer.prototype.handleContextRestored = function ()
{
    this._initContext();

    // empty all the old gl textures as they are useless now
    for (var key in utils.BaseTextureCache)
    {
        utils.BaseTextureCache[key]._glTextures.length = 0;
    }
};

/**
 * Removes everything from the renderer (event listeners, spritebatch, etc...)
 *
 * @param [removeView=false] {boolean} Removes the Canvas element from the DOM.
 */
WebGLRenderer.prototype.destroy = function (removeView)
{
    this.destroyPlugins();

    // remove listeners
    this.view.removeEventListener('webglcontextlost', this.handleContextLost);
    this.view.removeEventListener('webglcontextrestored', this.handleContextRestored);

    // call base destroy
    SystemRenderer.prototype.destroy.call(this, removeView);

    this.uid = 0;

    // destroy the managers
    this.shaderManager.destroy();
    this.maskManager.destroy();
    this.stencilManager.destroy();
    this.filterManager.destroy();

    this.shaderManager = null;
    this.maskManager = null;
    this.filterManager = null;
    this.blendModeManager = null;

    this.handleContextLost = null;
    this.handleContextRestored = null;

    this._contextOptions = null;

    this.drawCount = 0;

    this.gl = null;
};

/**
 * Maps Pixi blend modes to WebGL blend modes.
 *
 * @private
 */
WebGLRenderer.prototype._mapGlModes = function ()
{
    var gl = this.gl;

    if (!this.blendModes)
    {
        this.blendModes = {};

        this.blendModes[CONST.BLEND_MODES.NORMAL]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.ADD]           = [gl.SRC_ALPHA, gl.DST_ALPHA];
        this.blendModes[CONST.BLEND_MODES.MULTIPLY]      = [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.SCREEN]        = [gl.SRC_ALPHA, gl.ONE];
        this.blendModes[CONST.BLEND_MODES.OVERLAY]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.DARKEN]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.LIGHTEN]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.COLOR_DODGE]   = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.COLOR_BURN]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.HARD_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.SOFT_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.DIFFERENCE]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.EXCLUSION]     = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.HUE]           = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.SATURATION]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.COLOR]         = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        this.blendModes[CONST.BLEND_MODES.LUMINOSITY]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
    }

    if (!this.drawModes)
    {
        this.drawModes = {};

        this.drawModes[CONST.DRAW_MODES.POINTS]         = gl.POINTS;
        this.drawModes[CONST.DRAW_MODES.LINES]          = gl.LINES;
        this.drawModes[CONST.DRAW_MODES.LINE_LOOP]      = gl.LINE_LOOP;
        this.drawModes[CONST.DRAW_MODES.LINE_STRIP]     = gl.LINE_STRIP;
        this.drawModes[CONST.DRAW_MODES.TRIANGLES]      = gl.TRIANGLES;
        this.drawModes[CONST.DRAW_MODES.TRIANGLE_STRIP] = gl.TRIANGLE_STRIP;
        this.drawModes[CONST.DRAW_MODES.TRIANGLE_FAN]   = gl.TRIANGLE_FAN;
    }
};

},{"../../const":6,"../../utils":46,"../SystemRenderer":13,"./filters/FXAAFilter":21,"./managers/BlendModeManager":23,"./managers/FilterManager":24,"./managers/MaskManager":25,"./managers/ShaderManager":26,"./managers/StencilManager":27,"./utils/ObjectRenderer":33,"./utils/RenderTarget":35}],20:[function(require,module,exports){
var DefaultShader = require('../shaders/TextureShader');

/**
 * This is the base class for creating a PIXI filter. Currently only WebGL supports filters.
 * If you want to make a custom filter this should be your base class.
 *
 * @class
 * @memberof PIXI
 * @param vertexSrc {string|string[]} The vertex shader source as an array of strings.
 * @param fragmentSrc {string|string[]} The fragment shader source as an array of strings.
 * @param uniforms {object} An object containing the uniforms for this filter.
 */
function AbstractFilter(vertexSrc, fragmentSrc, uniforms)
{

    /**
     * An array of shaders
     * @member {Shader[]}
     * @private
     */
    this.shaders = [];

    /**
     * The extra padding that the filter might need
     * @member {number}
     */
    this.padding = 0;

    /**
     * The uniforms as an object
     * @member {object}
     */
    this.uniforms = uniforms || {};


    /**
     * The code of the vertex shader
     * @member {string[]}
     * @private
     */
    this.vertexSrc = vertexSrc || DefaultShader.defaultVertexSrc;

    /**
     * The code of the frament shader
     * @member {string[]}
     * @private
     */
    this.fragmentSrc = fragmentSrc || DefaultShader.defaultFragmentSrc;

    //TODO a reminder - would be cool to have lower res filters as this would give better performance.

    //typeof fragmentSrc === 'string' ? fragmentSrc.split('') : (fragmentSrc || []);

}

AbstractFilter.prototype.constructor = AbstractFilter;
module.exports = AbstractFilter;

/*
 * Grabs a shader from the current renderer
 * @param renderer {WebGLRenderer} The renderer to retrieve the shader from
 *
 */
AbstractFilter.prototype.getShader = function (renderer)
{
    var gl = renderer.gl;

    var shader = this.shaders[gl.id];

    if (!shader)
    {
        shader = new DefaultShader(renderer.shaderManager,
            this.vertexSrc,
            this.fragmentSrc,
            this.uniforms,
            this.attributes
        );

        this.shaders[gl.id] = shader;
    }

    return shader;
};

/*
 * Applies the filter
 * @param renderer {WebGLRenderer} The renderer to retrieve the filter from
 * @param input {RenderTarget}
 * @param output {RenderTarget}
 * @param clear {boolean} Whether or not we want to clear the outputTarget
 */
AbstractFilter.prototype.applyFilter = function (renderer, input, output, clear)
{
    var shader = this.getShader(renderer);

    renderer.filterManager.applyFilter(shader, input, output, clear);
};

/**
 * Syncs a uniform between the class object and the shaders.
 *
 */
AbstractFilter.prototype.syncUniform = function (uniform)
{
    for (var i = 0, j = this.shaders.length; i < j; ++i)
    {
        this.shaders[i].syncUniform(uniform);
    }
};

/*
AbstractFilter.prototype.apply = function (frameBuffer)
{
    // TODO :)
};
*/

},{"../shaders/TextureShader":32}],21:[function(require,module,exports){
var AbstractFilter = require('./AbstractFilter');
// @see https://github.com/substack/brfs/issues/25


/**
 *
 * Basic FXAA implementation based on the code on geeks3d.com with the
 * modification that the texture2DLod stuff was removed since it's
 * unsupported by WebGL.
 *
 * --
 * From:
 * https://github.com/mitsuhiko/webgl-meincraft
 *
 * @class
 * @extends PIXI.AbstractFilter
 * @memberof PIXI
 *
 */
function FXAAFilter()
{
    AbstractFilter.call(this,
        // vertex shader
        "\nprecision mediump float;\n\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform mat3 projectionMatrix;\nuniform vec2 resolution;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nvarying vec2 vResolution;\n\n//texcoords computed in vertex step\n//to avoid dependent texture reads\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\n\nvoid texcoords(vec2 fragCoord, vec2 resolution,\n            out vec2 v_rgbNW, out vec2 v_rgbNE,\n            out vec2 v_rgbSW, out vec2 v_rgbSE,\n            out vec2 v_rgbM) {\n    vec2 inverseVP = 1.0 / resolution.xy;\n    v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;\n    v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;\n    v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;\n    v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;\n    v_rgbM = vec2(fragCoord * inverseVP);\n}\n\nvoid main(void){\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n   vTextureCoord = aTextureCoord;\n   vColor = vec4(aColor.rgb * aColor.a, aColor.a);\n   vResolution = resolution;\n\n   //compute the texture coords and send them to varyings\n   texcoords(aTextureCoord * resolution, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n}\n",
        // fragment shader
        "precision lowp float;\n\n\n/**\nBasic FXAA implementation based on the code on geeks3d.com with the\nmodification that the texture2DLod stuff was removed since it's\nunsupported by WebGL.\n\n--\n\nFrom:\nhttps://github.com/mitsuhiko/webgl-meincraft\n\nCopyright (c) 2011 by Armin Ronacher.\n\nSome rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are\nmet:\n\n    * Redistributions of source code must retain the above copyright\n      notice, this list of conditions and the following disclaimer.\n\n    * Redistributions in binary form must reproduce the above\n      copyright notice, this list of conditions and the following\n      disclaimer in the documentation and/or other materials provided\n      with the distribution.\n\n    * The names of the contributors may not be used to endorse or\n      promote products derived from this software without specific\n      prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n\"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\nLIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\nA PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\nOWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n*/\n\n#ifndef FXAA_REDUCE_MIN\n    #define FXAA_REDUCE_MIN   (1.0/ 128.0)\n#endif\n#ifndef FXAA_REDUCE_MUL\n    #define FXAA_REDUCE_MUL   (1.0 / 8.0)\n#endif\n#ifndef FXAA_SPAN_MAX\n    #define FXAA_SPAN_MAX     8.0\n#endif\n\n//optimized version for mobile, where dependent\n//texture reads can be a bottleneck\nvec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution,\n            vec2 v_rgbNW, vec2 v_rgbNE,\n            vec2 v_rgbSW, vec2 v_rgbSE,\n            vec2 v_rgbM) {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / resolution.x, 1.0 / resolution.y);\n    vec3 rgbNW = texture2D(tex, v_rgbNW).xyz;\n    vec3 rgbNE = texture2D(tex, v_rgbNE).xyz;\n    vec3 rgbSW = texture2D(tex, v_rgbSW).xyz;\n    vec3 rgbSE = texture2D(tex, v_rgbSE).xyz;\n    vec4 texColor = texture2D(tex, v_rgbM);\n    vec3 rgbM  = texColor.xyz;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaNW = dot(rgbNW, luma);\n    float lumaNE = dot(rgbNE, luma);\n    float lumaSW = dot(rgbSW, luma);\n    float lumaSE = dot(rgbSE, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\n    mediump vec2 dir;\n    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\n    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *\n                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),\n              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),\n              dir * rcpDirMin)) * inverseVP;\n\n    vec3 rgbA = 0.5 * (\n        texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (\n        texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +\n        texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax))\n        color = vec4(rgbA, texColor.a);\n    else\n        color = vec4(rgbB, texColor.a);\n    return color;\n}\n\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying vec2 vResolution;\n\n//texcoords computed in vertex step\n//to avoid dependent texture reads\nvarying vec2 v_rgbNW;\nvarying vec2 v_rgbNE;\nvarying vec2 v_rgbSW;\nvarying vec2 v_rgbSE;\nvarying vec2 v_rgbM;\n\nuniform sampler2D uSampler;\n\n\nvoid main(void){\n\n    gl_FragColor = fxaa(uSampler, vTextureCoord * vResolution, vResolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);\n\n}\n",
        // uniforms
        {
            resolution: { type: 'v2', value: { x: 1, y: 1 } }
        }
    );

}

FXAAFilter.prototype = Object.create(AbstractFilter.prototype);
FXAAFilter.prototype.constructor = FXAAFilter;
module.exports = FXAAFilter;

FXAAFilter.prototype.applyFilter = function (renderer, input, output)
{
    var filterManager = renderer.filterManager;

    var shader = this.getShader( renderer );
     // draw the filter...
    filterManager.applyFilter(shader, input, output);
};

},{"./AbstractFilter":20}],22:[function(require,module,exports){
var AbstractFilter = require('./AbstractFilter'),
    math =  require('../../../math');

// @see https://github.com/substack/brfs/issues/25


/**
 * The SpriteMaskFilter class
 *
 * @class
 * @extends PIXI.AbstractFilter
 * @memberof PIXI
 * @param sprite {Sprite} the target sprite
 */
function SpriteMaskFilter(sprite)
{
    var maskMatrix = new math.Matrix();

    AbstractFilter.call(this,
        "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\n\nuniform mat3 projectionMatrix;\nuniform mat3 otherMatrix;\n\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n    vColor = vec4(aColor.rgb * aColor.a, aColor.a);\n}\n",
        "precision lowp float;\n\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\n\nuniform sampler2D uSampler;\nuniform float alpha;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n    // check clip! this will stop the mask bleeding out from the edges\n    vec2 text = abs( vMaskCoord - 0.5 );\n    text = step(0.5, text);\n    float clip = 1.0 - max(text.y, text.x);\n    vec4 original = texture2D(uSampler, vTextureCoord);\n    vec4 masky = texture2D(mask, vMaskCoord);\n    original *= (masky.r * masky.a * alpha * clip);\n    gl_FragColor = original;\n}\n",
        {
            mask:           { type: 'sampler2D', value: sprite._texture },
            alpha:          { type: 'f', value: 1},
            otherMatrix:    { type: 'mat3', value: maskMatrix.toArray(true) }
        }
    );

    this.maskSprite = sprite;
    this.maskMatrix = maskMatrix;
}

SpriteMaskFilter.prototype = Object.create(AbstractFilter.prototype);
SpriteMaskFilter.prototype.constructor = SpriteMaskFilter;
module.exports = SpriteMaskFilter;

/**
 * Applies the filter ? @alvin
 *
 * @param renderer {WebGLRenderer} A reference to the WebGL renderer
 * @param input {RenderTarget}
 * @param output {RenderTarget}
 */
SpriteMaskFilter.prototype.applyFilter = function (renderer, input, output)
{
    var filterManager = renderer.filterManager;

    this.uniforms.mask.value = this.maskSprite._texture;

    filterManager.calculateMappedMatrix(input.frame, this.maskSprite, this.maskMatrix);

    this.uniforms.otherMatrix.value = this.maskMatrix.toArray(true);
    this.uniforms.alpha.value = this.maskSprite.worldAlpha;

    var shader = this.getShader(renderer);
     // draw the filter...
    filterManager.applyFilter(shader, input, output);
};


Object.defineProperties(SpriteMaskFilter.prototype, {
    /**
     * The texture used for the displacement map. Must be power of 2 sized texture.
     *
     * @member {Texture}
     * @memberof SpriteMaskFilter#
     */
    map: {
        get: function ()
        {
            return this.uniforms.mask.value;
        },
        set: function (value)
        {
            this.uniforms.mask.value = value;
        }
    },

    /**
     * The offset used to move the displacement map.
     *
     * @member {Point}
     * @memberof SpriteMaskFilter#
     */
    offset: {
        get: function()
        {
            return this.uniforms.offset.value;
        },
        set: function(value)
        {
            this.uniforms.offset.value = value;
        }
    }
});

},{"../../../math":12,"./AbstractFilter":20}],23:[function(require,module,exports){
var WebGLManager = require('./WebGLManager');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.WebGlManager
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function BlendModeManager(renderer)
{
    WebGLManager.call(this, renderer);

    /**
     * @member {number}
     */
    this.currentBlendMode = 99999;
}

BlendModeManager.prototype = Object.create(WebGLManager.prototype);
BlendModeManager.prototype.constructor = BlendModeManager;
module.exports = BlendModeManager;

/**
 * Sets-up the given blendMode from WebGL's point of view.
 *
 * @param blendMode {number} the blendMode, should be a Pixi const, such as BlendModes.ADD
 */
BlendModeManager.prototype.setBlendMode = function (blendMode)
{
    if (this.currentBlendMode === blendMode)
    {
        return false;
    }

    this.currentBlendMode = blendMode;

    var mode = this.renderer.blendModes[this.currentBlendMode];
    this.renderer.gl.blendFunc(mode[0], mode[1]);

    return true;
};

},{"./WebGLManager":28}],24:[function(require,module,exports){
var WebGLManager = require('./WebGLManager'),
    RenderTarget = require('../utils/RenderTarget'),
    CONST = require('../../../const'),
    Quad = require('../utils/Quad'),
    math =  require('../../../math');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.WebGLManager
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function FilterManager(renderer)
{
    WebGLManager.call(this, renderer);

    /**
     * @member {any[]}
     */
    this.filterStack = [];

    this.filterStack.push({
        renderTarget:renderer.currentRenderTarget,
        filter:[],
        bounds:null
    });

    /**
     * @member {any[]}
     */
    this.texturePool = [];

    // listen for context and update necessary buffers
    //TODO make this dynamic!
    //TODO test this out by forces power of two?
    this.textureSize = new math.Rectangle( 0, 0, renderer.width, renderer.height );

    this.currentFrame = null;
}

FilterManager.prototype = Object.create(WebGLManager.prototype);
FilterManager.prototype.constructor = FilterManager;
module.exports = FilterManager;


/**
 * Called when there is a WebGL context change.
 *
 */
FilterManager.prototype.onContextChange = function ()
{
    this.texturePool.length = 0;

    var gl = this.renderer.gl;
    this.quad = new Quad(gl);
};

/**
 * @param renderer {WebGLRenderer}
 * @param buffer {ArrayBuffer}
 */
FilterManager.prototype.setFilterStack = function ( filterStack )
{
    this.filterStack = filterStack;
};

/**
 * Applies the filter and adds it to the current filter stack.
 *
 * @param filterBlock {object} the filter that will be pushed to the current filter stack
 */
FilterManager.prototype.pushFilter = function (target, filters)
{
    // get the bounds of the object..
    // TODO replace clone with a copy to save object creation
    var bounds = target.filterArea ? target.filterArea.clone() : target.getBounds();
    
    //bounds = bounds.clone();

    // round off the rectangle to get a nice smoooooooth filter :)
    bounds.x = bounds.x | 0;
    bounds.y = bounds.y | 0;
    bounds.width = bounds.width | 0;
    bounds.height = bounds.height | 0;


    // padding!
    var padding = filters[0].padding | 0;
    bounds.x -= padding;
    bounds.y -= padding;
    bounds.width += padding * 2;
    bounds.height += padding * 2;


    if(this.renderer.currentRenderTarget.transform)
    {
        //TODO this will break if the renderTexture transform is anything other than a translation.
        //Will need to take the full matrix transform into acount..
        var transform = this.renderer.currentRenderTarget.transform;

        bounds.x += transform.tx;
        bounds.y += transform.ty;

        this.capFilterArea( bounds );

        bounds.x -= transform.tx;
        bounds.y -= transform.ty;
    }
    else
    {
         this.capFilterArea( bounds );
    }

    if(bounds.width > 0 && bounds.height > 0)
    {
        this.currentFrame = bounds;

        var texture = this.getRenderTarget();

        this.renderer.setRenderTarget(texture);

        // clear the texture..
        texture.clear();

        // TODO get rid of object creation!
        this.filterStack.push({
            renderTarget: texture,
            filter: filters
        });

    }
    else
    {
        // push somthing on to the stack that is empty
        this.filterStack.push({
            renderTarget: null,
            filter: filters
        });
    }
};


/**
 * Removes the last filter from the filter stack and returns it.
 *
 */
FilterManager.prototype.popFilter = function ()
{
    var filterData = this.filterStack.pop();
    var previousFilterData = this.filterStack[this.filterStack.length-1];

    var input = filterData.renderTarget;

    // if the renderTarget is null then we don't apply the filter as its offscreen
    if(!filterData.renderTarget)
    {
        return;
    }

    var output = previousFilterData.renderTarget;

    // use program
    var gl = this.renderer.gl;


    this.currentFrame = input.frame;

    this.quad.map(this.textureSize, input.frame);


    // TODO.. this probably only needs to be done once!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quad.indexBuffer);

    var filters = filterData.filter;

    // assuming all filters follow the correct format??
    gl.vertexAttribPointer(this.renderer.shaderManager.defaultShader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(this.renderer.shaderManager.defaultShader.attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 2 * 4 * 4);
    gl.vertexAttribPointer(this.renderer.shaderManager.defaultShader.attributes.aColor, 4, gl.FLOAT, false, 0, 4 * 4 * 4);

    // restore the normal blendmode!
    this.renderer.blendModeManager.setBlendMode(CONST.BLEND_MODES.NORMAL);

    if (filters.length === 1)
    {
        // TODO (cengler) - There has to be a better way then setting this each time?
        if (filters[0].uniforms.dimensions)
        {
            filters[0].uniforms.dimensions.value[0] = this.renderer.width;
            filters[0].uniforms.dimensions.value[1] = this.renderer.height;
            filters[0].uniforms.dimensions.value[2] = this.quad.vertices[0];
            filters[0].uniforms.dimensions.value[3] = this.quad.vertices[5];
        }

        filters[0].applyFilter( this.renderer, input, output );
        this.returnRenderTarget( input );

    }
    else
    {
        var flipTexture = input;
        var flopTexture = this.getRenderTarget(true);

        for (var i = 0; i < filters.length-1; i++)
        {
            var filter = filters[i];

            // TODO (cengler) - There has to be a better way then setting this each time?
            if (filter.uniforms.dimensions)
            {
                filter.uniforms.dimensions.value[0] = this.renderer.width;
                filter.uniforms.dimensions.value[1] = this.renderer.height;
                filter.uniforms.dimensions.value[2] = this.quad.vertices[0];
                filter.uniforms.dimensions.value[3] = this.quad.vertices[5];
            }

            filter.applyFilter( this.renderer, flipTexture, flopTexture );

            var temp = flipTexture;
            flipTexture = flopTexture;
            flopTexture = temp;
        }

        filters[filters.length-1].applyFilter( this.renderer, flipTexture, output );

        this.returnRenderTarget( flipTexture );
        this.returnRenderTarget( flopTexture );
    }

    return filterData.filter;
};

/**
 * Grabs an render target from the internal pool
 *
 * @param clear {boolean} Whether or not we need to clear the RenderTarget
 * @return {RenderTarget}
 */
FilterManager.prototype.getRenderTarget = function ( clear )
{
    var renderTarget = this.texturePool.pop() || new RenderTarget(this.renderer.gl, this.textureSize.width, this.textureSize.height, CONST.SCALE_MODES.LINEAR, this.renderer.resolution * CONST.FILTER_RESOLUTION);
    renderTarget.frame = this.currentFrame;

    if (clear)
    {
        renderTarget.clear(true);
    }

    return renderTarget;
};

/*
 * Returns a RenderTarget to the internal pool
 * @param renderTarget {RenderTarget} The RenderTarget we want to return to the pool
 */
FilterManager.prototype.returnRenderTarget = function (renderTarget)
{
    this.texturePool.push( renderTarget );
};

/*
 * Applies the filter
 * @param shader {Shader} The shader to upload
 * @param inputTarget {RenderTarget}
 * @param outputTarget {RenderTarget}
 * @param clear {boolean} Whether or not we want to clear the outputTarget
 */
FilterManager.prototype.applyFilter = function (shader, inputTarget, outputTarget, clear)
{
    var gl = this.renderer.gl;

    this.renderer.setRenderTarget(outputTarget);

    if (clear)
    {
        outputTarget.clear();
    }

    // set the shader
    this.renderer.shaderManager.setShader(shader);

    // TODO (cengler) - Can this be cached and not `toArray`ed each frame?
    shader.uniforms.projectionMatrix.value = this.renderer.currentRenderTarget.projectionMatrix.toArray(true);

    //TODO can this be optimised?
    shader.syncUniforms();
/*
    gl.vertexAttribPointer(shader.attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(shader.attributes.aTextureCoord, 2, gl.FLOAT, false, 0, 2 * 4 * 4);
    gl.vertexAttribPointer(shader.attributes.aColor, 4, gl.FLOAT, false, 0, 4 * 4 * 4);
*/

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTarget.texture);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
};

/*
 * Calculates the mapped matrix
 * @param filterArea {Rectangle} The filter area
 * @param sprite {Sprite} the target sprite
 * @param outputMatrix {Matrix} @alvin
 */
// TODO playing around here.. this is temporary - (will end up in the shader)
FilterManager.prototype.calculateMappedMatrix = function (filterArea, sprite, outputMatrix)
{
    var worldTransform = sprite.worldTransform.copy(math.Matrix.TEMP_MATRIX),
    texture = sprite._texture.baseTexture;

    var mappedMatrix = outputMatrix.identity();

    // scale..
    var ratio = this.textureSize.height / this.textureSize.width;

    mappedMatrix.translate(filterArea.x / this.textureSize.width, filterArea.y / this.textureSize.height );

    mappedMatrix.scale(1 , ratio);

    var translateScaleX = (this.textureSize.width / texture.width);
    var translateScaleY = (this.textureSize.height / texture.height);

    worldTransform.tx /= texture.width * translateScaleX;
    worldTransform.ty /= texture.width * translateScaleX;

    worldTransform.invert();

    mappedMatrix.prepend(worldTransform);

    // apply inverse scale..
    mappedMatrix.scale(1 , 1/ratio);

    mappedMatrix.scale( translateScaleX , translateScaleY );

    mappedMatrix.translate(sprite.anchor.x, sprite.anchor.y);

    return mappedMatrix;

    // Keeping the orginal as a reminder to me on how this works!
    //
    // var m = new math.Matrix();

    // // scale..
    // var ratio = this.textureSize.height / this.textureSize.width;

    // m.translate(filterArea.x / this.textureSize.width, filterArea.y / this.textureSize.height);


    // m.scale(1 , ratio);


    // var transform = wt.clone();

    // var translateScaleX = (this.textureSize.width / 620);
    // var translateScaleY = (this.textureSize.height / 380);

    // transform.tx /= 620 * translateScaleX;
    // transform.ty /= 620 * translateScaleX;

    // transform.invert();

    // transform.append(m);

    // // apply inverse scale..
    // transform.scale(1 , 1/ratio);

    // transform.scale( translateScaleX , translateScaleY );

    // return transform;
};

/*
 * Constrains the filter area to the texture size
 * @param filterArea {Rectangle} The filter area we want to cap
 */
FilterManager.prototype.capFilterArea = function (filterArea)
{
    if (filterArea.x < 0)
    {
        filterArea.width += filterArea.x;
        filterArea.x = 0;
    }

    if (filterArea.y < 0)
    {
        filterArea.height += filterArea.y;
        filterArea.y = 0;
    }

    if ( filterArea.x + filterArea.width > this.textureSize.width )
    {
        filterArea.width = this.textureSize.width - filterArea.x;
    }

    if ( filterArea.y + filterArea.height > this.textureSize.height )
    {
        filterArea.height = this.textureSize.height - filterArea.y;
    }
};

/*
 * Resizes all the render targets in the pool
 * @param width {number} the new width
 * @param height {number} the new height
 */
FilterManager.prototype.resize = function ( width, height )
{
    this.textureSize.width = width;
    this.textureSize.height = height;

    for (var i = 0; i < this.texturePool.length; i++)
    {
        this.texturePool[i].resize( width, height );
    }
};

/**
 * Destroys the filter and removes it from the filter stack.
 *
 */
FilterManager.prototype.destroy = function ()
{
    this.filterStack = null;
    this.offsetY = 0;

    // destroy textures
    for (var i = 0; i < this.texturePool.length; i++)
    {
        this.texturePool[i].destroy();
    }

    this.texturePool = null;
};

},{"../../../const":6,"../../../math":12,"../utils/Quad":34,"../utils/RenderTarget":35,"./WebGLManager":28}],25:[function(require,module,exports){
var WebGLManager = require('./WebGLManager'),
    AlphaMaskFilter = require('../filters/SpriteMaskFilter');

/**
 * @class
 * @memberof PIXI
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function MaskManager(renderer)
{
    WebGLManager.call(this, renderer);

    this.stencilStack = [];
    this.reverse = true;
    this.count = 0;

    this.alphaMaskPool = [];
}

MaskManager.prototype = Object.create(WebGLManager.prototype);
MaskManager.prototype.constructor = MaskManager;
module.exports = MaskManager;

/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param graphics {Graphics}
 * @param webGLData {any[]}
 */
MaskManager.prototype.pushMask = function (target, maskData)
{
    if (maskData.texture)
    {
        this.pushSpriteMask(target, maskData);
    }
    else
    {
        this.pushStencilMask(target, maskData);
    }

};

/**
 * Removes the last mask from the mask stack and doesn't return it.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.popMask = function (target, maskData)
{
    if (maskData.texture)
    {
        this.popSpriteMask(target, maskData);
    }
    else
    {
        this.popStencilMask(target, maskData);
    }
};

/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.pushSpriteMask = function (target, maskData)
{
    var alphaMaskFilter = this.alphaMaskPool.pop();

    if (!alphaMaskFilter)
    {
        alphaMaskFilter = [new AlphaMaskFilter(maskData)];
    }

    alphaMaskFilter[0].maskSprite = maskData;
    this.renderer.filterManager.pushFilter(target, alphaMaskFilter);
};

/**
 * Removes the last filter from the filter stack and doesn't return it.
 *
 */
MaskManager.prototype.popSpriteMask = function ()
{
    var filters = this.renderer.filterManager.popFilter();

    this.alphaMaskPool.push(filters);
};


/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.pushStencilMask = function (target, maskData)
{
    this.renderer.stencilManager.pushMask(maskData);
};

/**
 * Removes the last filter from the filter stack and doesn't return it.
 * @param target {RenderTarget}
 * @param maskData {any[]}
 */
MaskManager.prototype.popStencilMask = function (target, maskData)
{
    this.renderer.stencilManager.popMask(maskData);
};


},{"../filters/SpriteMaskFilter":22,"./WebGLManager":28}],26:[function(require,module,exports){
var WebGLManager = require('./WebGLManager'),
    TextureShader = require('../shaders/TextureShader'),
    ComplexPrimitiveShader = require('../shaders/ComplexPrimitiveShader'),
    PrimitiveShader = require('../shaders/PrimitiveShader'),
    utils = require('../../../utils');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.WebGLManager
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function ShaderManager(renderer)
{
    WebGLManager.call(this, renderer);

    /**
     * @member {number}
     */
    this.maxAttibs = 10;

    /**
     * @member {any[]}
     */
    this.attribState = [];

    /**
     * @member {any[]}
     */
    this.tempAttribState = [];

    for (var i = 0; i < this.maxAttibs; i++)
    {
        this.attribState[i] = false;
    }

    /**
     * @member {any[]}
     */
    this.stack = [];

    /**
     * @member {number}
     * @private
     */
    this._currentId = -1;

    /**
     * @member {Shader}
     * @private
     */
    this.currentShader = null;

//    this.initPlugins();
}

ShaderManager.prototype = Object.create(WebGLManager.prototype);
ShaderManager.prototype.constructor = ShaderManager;
utils.pluginTarget.mixin(ShaderManager);

module.exports = ShaderManager;

/**
 * Called when there is a WebGL context change.
 *
 */
ShaderManager.prototype.onContextChange = function ()
{
    this.initPlugins();

    var gl = this.renderer.gl;

    // get the maximum number of attribute correctly as this tends to vary
    this.maxAttibs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

    this.attribState = [];

    for (var i = 0; i < this.maxAttibs; i++)
    {
        this.attribState[i] = false;
    }

    // TODO - Why are these not plugins? We can't decouple primitives unless they are....
    this.defaultShader = new TextureShader(this);
    this.primitiveShader = new PrimitiveShader(this);
    this.complexPrimitiveShader = new ComplexPrimitiveShader(this);
};

/**
 * Takes the attributes given in parameters and uploads them.
 *
 * @param attribs {Array} attribs
 */
ShaderManager.prototype.setAttribs = function (attribs)
{
    // reset temp state
    var i;

    for (i = 0; i < this.tempAttribState.length; i++)
    {
        this.tempAttribState[i] = false;
    }

    // set the new attribs
    for (var a in attribs)
    {
        this.tempAttribState[attribs[a]] = true;
    }

    var gl = this.renderer.gl;

    for (i = 0; i < this.attribState.length; i++)
    {
        if (this.attribState[i] !== this.tempAttribState[i])
        {
            this.attribState[i] = this.tempAttribState[i];

            if (this.attribState[i])
            {
                gl.enableVertexAttribArray(i);
            }
            else
            {
                gl.disableVertexAttribArray(i);
            }
        }
    }
};

/**
 * Sets the current shader.
 *
 * @param shader {Shader} the shader to upload
 */
ShaderManager.prototype.setShader = function (shader)
{
    if (this._currentId === shader.uid)
    {
        return false;
    }

    this._currentId = shader.uid;

    this.currentShader = shader;

    this.renderer.gl.useProgram(shader.program);
    this.setAttribs(shader.attributes);

    return true;
};

/**
 * Destroys this object.
 *
 */
ShaderManager.prototype.destroy = function ()
{
    WebGLManager.prototype.destroy.call(this);

    this.destroyPlugins();

    this.attribState = null;

    this.tempAttribState = null;
};

},{"../../../utils":46,"../shaders/ComplexPrimitiveShader":29,"../shaders/PrimitiveShader":30,"../shaders/TextureShader":32,"./WebGLManager":28}],27:[function(require,module,exports){
var WebGLManager = require('./WebGLManager'),
    utils = require('../../../utils');

/**
 * @class
 * @memberof PIXI
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function WebGLMaskManager(renderer)
{
    WebGLManager.call(this, renderer);
    this.stencilMaskStack = null;
}

WebGLMaskManager.prototype = Object.create(WebGLManager.prototype);
WebGLMaskManager.prototype.constructor = WebGLMaskManager;
module.exports = WebGLMaskManager;

/**
 * Changes the mask stack that is used by this manager
 * @param stencilMaskStack {StencilMaskStack} The mask stack 
 *
 */
WebGLMaskManager.prototype.setMaskStack = function ( stencilMaskStack )
{
    this.stencilMaskStack = stencilMaskStack;

    var gl = this.renderer.gl;

    if (stencilMaskStack.stencilStack.length === 0)
    {
        gl.disable(gl.STENCIL_TEST);
    }
    else
    {
        gl.enable(gl.STENCIL_TEST);
    }
};

/**
 * Applies the Mask and adds it to the current filter stack. @alvin
 * 
 * @param graphics {Graphics}
 * @param webGLData {any[]}
 */
WebGLMaskManager.prototype.pushStencil = function (graphics, webGLData)
{
    this.renderer.currentRenderTarget.attachStencilBuffer();

    var gl = this.renderer.gl,
        sms = this.stencilMaskStack;

    this.bindGraphics(graphics, webGLData, this.renderer);

    if (sms.stencilStack.length === 0)
    {
        gl.enable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        sms.reverse = true;
        sms.count = 0;
    }

    sms.stencilStack.push(webGLData);

    var level = sms.count;

    gl.colorMask(false, false, false, false);

    gl.stencilFunc(gl.ALWAYS,0,0xFF);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);

    // draw the triangle strip!

    if (webGLData.mode === 1)
    {
        gl.drawElements(gl.TRIANGLE_FAN,  webGLData.indices.length - 4, gl.UNSIGNED_SHORT, 0 );

        if (sms.reverse)
        {
            gl.stencilFunc(gl.EQUAL, 0xFF - level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
        }

        // draw a quad to increment..
        gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, ( webGLData.indices.length - 4 ) * 2 );

        if (sms.reverse)
        {
            gl.stencilFunc(gl.EQUAL,0xFF-(level+1), 0xFF);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
        }

        sms.reverse = !sms.reverse;
    }
    else
    {
        if (!sms.reverse)
        {
            gl.stencilFunc(gl.EQUAL, 0xFF - level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level, 0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
        }

        gl.drawElements(gl.TRIANGLE_STRIP,  webGLData.indices.length, gl.UNSIGNED_SHORT, 0 );

        if (!sms.reverse)
        {
            gl.stencilFunc(gl.EQUAL,0xFF-(level+1), 0xFF);
        }
        else
        {
            gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
        }
    }

    gl.colorMask(true, true, true, true);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);

    sms.count++;
};

/**
 * TODO this does not belong here!
 *
 * @param graphics {Graphics}
 * @param webGLData {Array}
 */
WebGLMaskManager.prototype.bindGraphics = function (graphics, webGLData)
{
    //if (this._currentGraphics === graphics)return;
    this._currentGraphics = graphics;

    var gl = this.renderer.gl;

     // bind the graphics object..
    var shader;// = this.renderer.shaderManager.plugins.primitiveShader;

    if (webGLData.mode === 1)
    {
        shader = this.renderer.shaderManager.complexPrimitiveShader;

        this.renderer.shaderManager.setShader(shader);

        gl.uniformMatrix3fv(shader.uniforms.translationMatrix._location, false, graphics.worldTransform.toArray(true));

        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix._location, false, this.renderer.currentRenderTarget.projectionMatrix.toArray(true));

        gl.uniform3fv(shader.uniforms.tint._location, utils.hex2rgb(graphics.tint));

        gl.uniform3fv(shader.uniforms.color._location, webGLData.color);

        gl.uniform1f(shader.uniforms.alpha._location, graphics.worldAlpha);

        gl.bindBuffer(gl.ARRAY_BUFFER, webGLData.buffer);

        gl.vertexAttribPointer(shader.attributes.aVertexPosition, 2, gl.FLOAT, false, 4 * 2, 0);


        // now do the rest..
        // set the index buffer!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGLData.indexBuffer);
    }
    else
    {
        //this.renderer.shaderManager.activatePrimitiveShader();
        shader = this.renderer.shaderManager.primitiveShader;

        this.renderer.shaderManager.setShader( shader );

        gl.uniformMatrix3fv(shader.uniforms.translationMatrix._location, false, graphics.worldTransform.toArray(true));

        gl.uniformMatrix3fv(shader.uniforms.projectionMatrix._location, false, this.renderer.currentRenderTarget.projectionMatrix.toArray(true));

        gl.uniform3fv(shader.uniforms.tint._location, utils.hex2rgb(graphics.tint));

        gl.uniform1f(shader.uniforms.alpha._location, graphics.worldAlpha);

        gl.bindBuffer(gl.ARRAY_BUFFER, webGLData.buffer);

        gl.vertexAttribPointer(shader.attributes.aVertexPosition, 2, gl.FLOAT, false, 4 * 6, 0);
        gl.vertexAttribPointer(shader.attributes.aColor, 4, gl.FLOAT, false,4 * 6, 2 * 4);

        // set the index buffer!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGLData.indexBuffer);
    }
};

/**
 * TODO @alvin
 * @param graphics {Graphics}
 * @param webGLData {Array}
 */
WebGLMaskManager.prototype.popStencil = function (graphics, webGLData)
{
    var gl = this.renderer.gl,
        sms = this.stencilMaskStack;

    sms.stencilStack.pop();

    sms.count--;

    if (sms.stencilStack.length === 0)
    {
        // the stack is empty!
        gl.disable(gl.STENCIL_TEST);

    }
    else
    {

        var level = sms.count;

        this.bindGraphics(graphics, webGLData, this.renderer);

        gl.colorMask(false, false, false, false);

        if (webGLData.mode === 1)
        {
            sms.reverse = !sms.reverse;

            if (sms.reverse)
            {
                gl.stencilFunc(gl.EQUAL, 0xFF - (level+1), 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
            }

            // draw a quad to increment..
            gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, ( webGLData.indices.length - 4 ) * 2 );

            gl.stencilFunc(gl.ALWAYS,0,0xFF);
            gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);

            // draw the triangle strip!
            gl.drawElements(gl.TRIANGLE_FAN,  webGLData.indices.length - 4, gl.UNSIGNED_SHORT, 0 );

            if (!sms.reverse)
            {
                gl.stencilFunc(gl.EQUAL,0xFF-(level), 0xFF);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level, 0xFF);
            }

        }
        else
        {
          //  console.log("<<>>")
            if (!sms.reverse)
            {
                gl.stencilFunc(gl.EQUAL, 0xFF - (level+1), 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level+1, 0xFF);
                gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);
            }

            gl.drawElements(gl.TRIANGLE_STRIP,  webGLData.indices.length, gl.UNSIGNED_SHORT, 0 );

            if (!sms.reverse)
            {
                gl.stencilFunc(gl.EQUAL,0xFF-(level), 0xFF);
            }
            else
            {
                gl.stencilFunc(gl.EQUAL,level, 0xFF);
            }
        }

        gl.colorMask(true, true, true, true);
        gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);


    }
};

/**
 * Destroys the mask stack.
 *
 */
WebGLMaskManager.prototype.destroy = function ()
{
    WebGLManager.prototype.destroy.call(this);

    this.stencilMaskStack.stencilStack = null;
};

/**
 * Applies the Mask and adds it to the current filter stack.
 *
 * @param maskData {any[]} The mask data structure to use
 */
WebGLMaskManager.prototype.pushMask = function (maskData)
{


    this.renderer.setObjectRenderer(this.renderer.plugins.graphics);

    if (maskData.dirty)
    {
        this.renderer.plugins.graphics.updateGraphics(maskData, this.renderer.gl);
    }

    if (!maskData._webGL[this.renderer.gl.id].data.length)
    {
        return;
    }

    this.pushStencil(maskData, maskData._webGL[this.renderer.gl.id].data[0], this.renderer);
};

/**
 * Removes the last filter from the filter stack and doesn't return it.
 *
 * @param maskData {any[]}
 */
WebGLMaskManager.prototype.popMask = function (maskData)
{
    this.renderer.setObjectRenderer(this.renderer.plugins.graphics);

    this.popStencil(maskData, maskData._webGL[this.renderer.gl.id].data[0], this.renderer);
};


},{"../../../utils":46,"./WebGLManager":28}],28:[function(require,module,exports){
/**
 * @class
 * @memberof PIXI
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function WebGLManager(renderer)
{
    /**
     * The renderer this manager works for.
     *
     * @member {WebGLRenderer}
     */
    this.renderer = renderer;

    this.renderer.on('context', this.onContextChange, this);
}

WebGLManager.prototype.constructor = WebGLManager;
module.exports = WebGLManager;

/**
 * Generic method called when there is a WebGL context change.
 *
 */
WebGLManager.prototype.onContextChange = function ()
{
	// do some codes init!
};

/**
 * Generic destroy methods to be overridden by the subclass
 *
 */
WebGLManager.prototype.destroy = function ()
{
    this.renderer.off('context', this.onContextChange, this);

    this.renderer = null;
};

},{}],29:[function(require,module,exports){
var Shader = require('./Shader');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.Shader
 * @param shaderManager {ShaderManager} The webgl shader manager this shader works for.
 */
function ComplexPrimitiveShader(shaderManager)
{
    Shader.call(this,
        shaderManager,
        // vertex shader
        [
            'attribute vec2 aVertexPosition;',

            'uniform mat3 translationMatrix;',
            'uniform mat3 projectionMatrix;',

            'uniform vec3 tint;',
            'uniform float alpha;',
            'uniform vec3 color;',

            'varying vec4 vColor;',

            'void main(void){',
            '   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',
            '   vColor = vec4(color * alpha * tint, alpha);',//" * vec4(tint * alpha, alpha);',
            '}'
        ].join('\n'),
        // fragment shader
        [
            'precision mediump float;',

            'varying vec4 vColor;',

            'void main(void){',
            '   gl_FragColor = vColor;',
            '}'
        ].join('\n'),
        // custom uniforms
        {
            tint:   { type: '3f', value: [0, 0, 0] },
            alpha:  { type: '1f', value: 0 },
            color:  { type: '3f', value: [0,0,0] },
            translationMatrix: { type: 'mat3', value: new Float32Array(9) },
            projectionMatrix: { type: 'mat3', value: new Float32Array(9) }
        },
        // attributes
        {
            aVertexPosition:0
        }
    );
}

ComplexPrimitiveShader.prototype = Object.create(Shader.prototype);
ComplexPrimitiveShader.prototype.constructor = ComplexPrimitiveShader;
module.exports = ComplexPrimitiveShader;

},{"./Shader":31}],30:[function(require,module,exports){
var Shader = require('./Shader');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.Shader
 * @param shaderManager {ShaderManager} The webgl shader manager this shader works for.
 */
function PrimitiveShader(shaderManager)
{
    Shader.call(this,
        shaderManager,
        // vertex shader
        [
            'attribute vec2 aVertexPosition;',
            'attribute vec4 aColor;',

            'uniform mat3 translationMatrix;',
            'uniform mat3 projectionMatrix;',

            'uniform float alpha;',
            'uniform float flipY;',
            'uniform vec3 tint;',

            'varying vec4 vColor;',

            'void main(void){',
            '   gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',
            '   vColor = aColor * vec4(tint * alpha, alpha);',
            '}'
        ].join('\n'),
        // fragment shader
        [
            'precision mediump float;',

            'varying vec4 vColor;',

            'void main(void){',
            '   gl_FragColor = vColor;',
            '}'
        ].join('\n'),
        // custom uniforms
        {
            tint:   { type: '3f', value: [0, 0, 0] },
            alpha:  { type: '1f', value: 0 },
            translationMatrix: { type: 'mat3', value: new Float32Array(9) },
            projectionMatrix: { type: 'mat3', value: new Float32Array(9) }
        },
        // custom attributes
        {
            aVertexPosition:0,
            aColor:0
        }
    );
}

PrimitiveShader.prototype = Object.create(Shader.prototype);
PrimitiveShader.prototype.constructor = PrimitiveShader;
module.exports = PrimitiveShader;

},{"./Shader":31}],31:[function(require,module,exports){
/*global console */
var utils = require('../../../utils');

/**
 * @class
 * @memberof PIXI
 * @param shaderManager {ShaderManager} The webgl shader manager this shader works for.
 * @param [vertexSrc] {string} The source of the vertex shader.
 * @param [fragmentSrc] {string} The source of the fragment shader.
 * @param [uniforms] {object} Uniforms for this shader.
 * @param [attributes] {object} Attributes for this shader.
 */
function Shader(shaderManager, vertexSrc, fragmentSrc, uniforms, attributes)
{
    if (!vertexSrc || !fragmentSrc)
    {
         throw new Error('Pixi.js Error. Shader requires vertexSrc and fragmentSrc');
    }

    /**
     * A unique id
     * @member {number}
     * @readonly
     */
    this.uid = utils.uid();

    /**
     * The current WebGL drawing context
     * @member {WebGLRenderingContext}
     * @readonly
     */
    this.gl = shaderManager.renderer.gl;

    //TODO maybe we should pass renderer rather than shader manger?? food for thought..
    this.shaderManager = shaderManager;

    /**
     * The WebGL program.
     *
     * @member {WebGLProgram}
     * @readonly
     */
    this.program = null;

    /**
     * The uniforms as an object
     * @member {object}
     * @private
     */
    this.uniforms = uniforms || {};

    /**
     * The attributes as an object
     * @member {object}
     * @private
     */
    this.attributes = attributes || {};

    /**
     * Internal texture counter
     * @member {number}
     * @private
     */
    this.textureCount = 1;

    /**
     * The vertex shader as an array of strings
     *
     * @member {string}
     */
    this.vertexSrc = vertexSrc;

    /**
     * The fragment shader as an array of strings
     *
     * @member {string}
     */
    this.fragmentSrc = fragmentSrc;

    this.init();
}

Shader.prototype.constructor = Shader;
module.exports = Shader;

/*
 * Creates the shader and uses it
 *
 */
Shader.prototype.init = function ()
{
    this.compile();

    this.gl.useProgram(this.program);

    this.cacheUniformLocations(Object.keys(this.uniforms));
    this.cacheAttributeLocations(Object.keys(this.attributes));
};

/*
 * Caches the locations of the uniform for reuse
 * @param keys {string} the uniforms to cache
 */
Shader.prototype.cacheUniformLocations = function (keys)
{
    for (var i = 0; i < keys.length; ++i)
    {
        this.uniforms[keys[i]]._location = this.gl.getUniformLocation(this.program, keys[i]);
    }
};

/*
 * Caches the locations of the attribute for reuse
 * @param keys {string} the attributes to cache
 */
Shader.prototype.cacheAttributeLocations = function (keys)
{
    for (var i = 0; i < keys.length; ++i)
    {
        this.attributes[keys[i]] = this.gl.getAttribLocation(this.program, keys[i]);
    }

    // TODO: Check if this is needed anymore...

    // Begin worst hack eva //

    // WHY??? ONLY on my chrome pixel the line above returns -1 when using filters?
    // maybe its something to do with the current state of the gl context.
    // I'm convinced this is a bug in the chrome browser as there is NO reason why this should be returning -1 especially as it only manifests on my chrome pixel
    // If theres any webGL people that know why could happen please help :)
    // if (this.attributes.aColor === -1){
    //     this.attributes.aColor = 2;
    // }

    // End worst hack eva //
};

/*
 * Attaches the shaders and creates the program
 * @return {WebGLProgram}
 */
Shader.prototype.compile = function ()
{
    var gl = this.gl;

    var glVertShader = this._glCompile(gl.VERTEX_SHADER, this.vertexSrc);
    var glFragShader = this._glCompile(gl.FRAGMENT_SHADER, this.fragmentSrc);

    var program = gl.createProgram();

    gl.attachShader(program, glVertShader);
    gl.attachShader(program, glFragShader);
    gl.linkProgram(program);

    // if linking fails, then log and cleanup
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        console.error('Pixi.js Error: Could not initialize shader.');
        console.error('gl.VALIDATE_STATUS', gl.getProgramParameter(program, gl.VALIDATE_STATUS));
        console.error('gl.getError()', gl.getError());

        // if there is a program info log, log it
        if (gl.getProgramInfoLog(program) !== '')
        {
            console.warn('Pixi.js Warning: gl.getProgramInfoLog()', gl.getProgramInfoLog(program));
        }

        gl.deleteProgram(program);
        program = null;
    }

    // clean up some shaders
    gl.deleteShader(glVertShader);
    gl.deleteShader(glFragShader);

    return (this.program = program);
};

/*
Shader.prototype.buildSync = function ()
{
   // var str = ""

   // str =  "Shader.prototype.syncUniforms = function()";
   // str += "{\n";

    for (var key in this.uniforms)
    {
        var uniform = this.uniforms[key];

        Object.defineProperty(this, key, {

            get: function ()
            {
                return uniform.value
            },
            set: function (value)
            {
                this.setUniform(uniform, value);
            }
        });

        console.log( makePropSetter( key, " bloop", uniform.type )  )
  //      Object.def
        //    location = uniform._location,
          //  value = uniform.value,
            //i, il;

    //    str += "gl.uniform1i(this.uniforms."+ key +"._location, this.uniforms." + key + ".value );\n"

    }

}*/

/**
* Adds a new uniform
*
* @param uniform {Object} the new uniform to attach
*/
Shader.prototype.syncUniform = function (uniform)
{
    var location = uniform._location,
        value = uniform.value,
        gl = this.gl,
        i, il;

    switch (uniform.type)
    {
        case 'b':
        case 'bool':
        case 'boolean':
            gl.uniform1i(location, value ? 1 : 0);
            break;

        // single int value
        case 'i':
        case '1i':
            gl.uniform1i(location, value);
            break;

        // single float value
        case 'f':
        case '1f':
            gl.uniform1f(location, value);
            break;

        // Float32Array(2) or JS Arrray
        case '2f':
            gl.uniform2f(location, value[0], value[1]);
            break;

        // Float32Array(3) or JS Arrray
        case '3f':
            gl.uniform3f(location, value[0], value[1], value[2]);
            break;

        // Float32Array(4) or JS Arrray
        case '4f':
            gl.uniform4f(location, value[0], value[1], value[2], value[3]);
            break;

        // a 2D Point object
        case 'v2':
            gl.uniform2f(location, value.x, value.y);
            break;

        // a 3D Point object
        case 'v3':
            gl.uniform3f(location, value.x, value.y, value.z);
            break;

        // a 4D Point object
        case 'v4':
            gl.uniform4f(location, value.x, value.y, value.z, value.w);
            break;

        // Int32Array or JS Array
        case '1iv':
            gl.uniform1iv(location, value);
            break;

        // Int32Array or JS Array
        case '2iv':
            gl.uniform2iv(location, value);
            break;

        // Int32Array or JS Array
        case '3iv':
            gl.uniform3iv(location, value);
            break;

        // Int32Array or JS Array
        case '4iv':
            gl.uniform4iv(location, value);
            break;

        // Float32Array or JS Array
        case '1fv':
            gl.uniform1fv(location, value);
            break;

        // Float32Array or JS Array
        case '2fv':
            gl.uniform2fv(location, value);
            break;

        // Float32Array or JS Array
        case '3fv':
            gl.uniform3fv(location, value);
            break;

        // Float32Array or JS Array
        case '4fv':
            gl.uniform4fv(location, value);
            break;

        // Float32Array or JS Array
        case 'm2':
        case 'mat2':
        case 'Matrix2fv':
            gl.uniformMatrix2fv(location, uniform.transpose, value);
            break;

        // Float32Array or JS Array
        case 'm3':
        case 'mat3':
        case 'Matrix3fv':

            gl.uniformMatrix3fv(location, uniform.transpose, value);
            break;

        // Float32Array or JS Array
        case 'm4':
        case 'mat4':
        case 'Matrix4fv':
            gl.uniformMatrix4fv(location, uniform.transpose, value);
            break;

        // a Color Value
        case 'c':
            if (typeof value === 'number')
            {
                value = utils.hex2rgb(value);
            }

            gl.uniform3f(location, value[0], value[1], value[2]);
            break;

        // flat array of integers (JS or typed array)
        case 'iv1':
            gl.uniform1iv(location, value);
            break;

        // flat array of integers with 3 x N size (JS or typed array)
        case 'iv':
            gl.uniform3iv(location, value);
            break;

        // flat array of floats (JS or typed array)
        case 'fv1':
            gl.uniform1fv(location, value);
            break;

        // flat array of floats with 3 x N size (JS or typed array)
        case 'fv':
            gl.uniform3fv(location, value);
            break;

        // array of 2D Point objects
        case 'v2v':
            if (!uniform._array)
            {
                uniform._array = new Float32Array(2 * value.length);
            }

            for (i = 0, il = value.length; i < il; ++i)
            {
                uniform._array[i * 2]       = value[i].x;
                uniform._array[i * 2 + 1]   = value[i].y;
            }

            gl.uniform2fv(location, uniform._array);
            break;

        // array of 3D Point objects
        case 'v3v':
            if (!uniform._array)
            {
                uniform._array = new Float32Array(3 * value.length);
            }

            for (i = 0, il = value.length; i < il; ++i)
            {
                uniform._array[i * 3]       = value[i].x;
                uniform._array[i * 3 + 1]   = value[i].y;
                uniform._array[i * 3 + 2]   = value[i].z;

            }

            gl.uniform3fv(location, uniform._array);
            break;

        // array of 4D Point objects
        case 'v4v':
            if (!uniform._array)
            {
                uniform._array = new Float32Array(4 * value.length);
            }

            for (i = 0, il = value.length; i < il; ++i)
            {
                uniform._array[i * 4]       = value[i].x;
                uniform._array[i * 4 + 1]   = value[i].y;
                uniform._array[i * 4 + 2]   = value[i].z;
                uniform._array[i * 4 + 3]   = value[i].w;

            }

            gl.uniform4fv(location, uniform._array);
            break;

        // PIXI.Texture
        case 't':
        case 'sampler2D':

            if (!uniform.value || !uniform.value.baseTexture.hasLoaded)
            {
                break;
            }

            // activate this texture
            gl.activeTexture(gl['TEXTURE' + this.textureCount]);

            var texture = uniform.value.baseTexture._glTextures[gl.id];

            if (!texture)
            {
                this.initSampler2D(uniform);

                // set the textur to the newly created one..
                texture = uniform.value.baseTexture._glTextures[gl.id];
            }

            // bind the texture
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // set uniform to texture index
            gl.uniform1i(uniform._location, this.textureCount);

            // increment next texture id
            this.textureCount++;

            break;

        default:
            console.warn('Pixi.js Shader Warning: Unknown uniform type: ' + uniform.type);
    }
};

/*
 * Updates the shader uniform values.
 */
Shader.prototype.syncUniforms = function ()
{
    this.textureCount = 1;

    for (var key in this.uniforms)
    {
        this.syncUniform(this.uniforms[key]);
    }
};


/**
 * Initialises a Sampler2D uniform (which may only be available later on after initUniforms once the texture has loaded)
 *
 */
Shader.prototype.initSampler2D = function (uniform)
{
    var gl = this.gl;

    var texture = uniform.value.baseTexture;

    if(!texture.hasLoaded)
    {
        return;
    }



    if (uniform.textureData)
    {

        //TODO move this...
        var data = uniform.textureData;

        texture._glTextures[gl.id] = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultipliedAlpha);
        // GLTexture = mag linear, min linear_mipmap_linear, wrap repeat + gl.generateMipmap(gl.TEXTURE_2D);
        // GLTextureLinear = mag/min linear, wrap clamp
        // GLTextureNearestRepeat = mag/min NEAREST, wrap repeat
        // GLTextureNearest = mag/min nearest, wrap clamp
        // AudioTexture = whatever + luminance + width 512, height 2, border 0
        // KeyTexture = whatever + luminance + width 256, height 2, border 0

        //  magFilter can be: gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR or gl.NEAREST
        //  wrapS/T can be: gl.CLAMP_TO_EDGE or gl.REPEAT

        gl.texImage2D(gl.TEXTURE_2D, 0, data.luminance ? gl.LUMINANCE : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, data.magFilter ? data.magFilter : gl.LINEAR );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, data.wrapS ? data.wrapS : gl.CLAMP_TO_EDGE );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, data.wrapS ? data.wrapS : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, data.wrapT ? data.wrapT : gl.CLAMP_TO_EDGE);
    }
    else
    {
        this.shaderManager.renderer.updateTexture(texture);
    }
};

/**
 * Destroys the shader.
 *
 */
Shader.prototype.destroy = function ()
{
    this.gl.deleteProgram(this.program);

    this.gl = null;
    this.uniforms = null;
    this.attributes = null;

    this.vertexSrc = null;
    this.fragmentSrc = null;
};

Shader.prototype._glCompile = function (type, src)
{
    var shader = this.gl.createShader(type);

    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS))
    {
        console.log(this.gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

},{"../../../utils":46}],32:[function(require,module,exports){
var Shader = require('./Shader');

/**
 * @class
 * @memberof PIXI
 * @extends PIXI.Shader
 * @param shaderManager {ShaderManager} The webgl shader manager this shader works for.
 * @param [vertexSrc] {string} The source of the vertex shader.
 * @param [fragmentSrc] {string} The source of the fragment shader.
 * @param [customUniforms] {object} Custom uniforms to use to augment the built-in ones.
 * @param [fragmentSrc] {string} The source of the fragment shader.
 */
function TextureShader(shaderManager, vertexSrc, fragmentSrc, customUniforms, customAttributes)
{
    var uniforms = {

        uSampler:           { type: 'sampler2D', value: 0 },
        projectionMatrix:   { type: 'mat3', value: new Float32Array([1, 0, 0,
                                                                     0, 1, 0,
                                                                     0, 0, 1]) }
    };

    if (customUniforms)
    {
        for (var u in customUniforms)
        {
            uniforms[u] = customUniforms[u];
        }
    }


    var attributes = {
        aVertexPosition:    0,
        aTextureCoord:      0,
        aColor:             0
    };

    if (customAttributes)
    {
        for (var a in customAttributes)
        {
            attributes[a] = customAttributes[a];
        }
    }

    /**
     * The vertex shader.
     * @member {Array}
     */
    vertexSrc = vertexSrc || TextureShader.defaultVertexSrc;

    /**
     * The fragment shader.
     * @member {Array}
     */
    fragmentSrc = fragmentSrc || TextureShader.defaultFragmentSrc;

    Shader.call(this, shaderManager, vertexSrc, fragmentSrc, uniforms, attributes);
}

// constructor
TextureShader.prototype = Object.create(Shader.prototype);
TextureShader.prototype.constructor = TextureShader;
module.exports = TextureShader;

TextureShader.defaultVertexSrc = [
    'precision lowp float;',
    'attribute vec2 aVertexPosition;',
    'attribute vec2 aTextureCoord;',
    'attribute vec4 aColor;',

    'uniform mat3 projectionMatrix;',

    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',

    'void main(void){',
    '   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);',
    '   vTextureCoord = aTextureCoord;',
    '   vColor = vec4(aColor.rgb * aColor.a, aColor.a);',
    '}'
].join('\n');

TextureShader.defaultFragmentSrc = [
    'precision lowp float;',

    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',

    'uniform sampler2D uSampler;',

    'void main(void){',
    '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;',
    '}'
].join('\n');

},{"./Shader":31}],33:[function(require,module,exports){
var WebGLManager = require('../managers/WebGLManager');

/**
 * Base for a common object renderer that can be used as a system renderer plugin.
 *
 * @class
 * @extends PIXI.WebGLManager
 * @memberof PIXI
 * @param renderer {WebGLRenderer} The renderer this object renderer works for.
 */
function ObjectRenderer(renderer)
{
    WebGLManager.call(this, renderer);
}


ObjectRenderer.prototype = Object.create(WebGLManager.prototype);
ObjectRenderer.prototype.constructor = ObjectRenderer;
module.exports = ObjectRenderer;

/**
 * Starts the renderer and sets the shader
 *
 */
ObjectRenderer.prototype.start = function ()
{
    // set the shader..
};

/**
 * Stops the renderer
 *
 */
ObjectRenderer.prototype.stop = function ()
{
    this.flush();
};

/**
 * flushes
 *
 */
ObjectRenderer.prototype.flush = function ()
{
    // flush!
};

/**
 * Renders an object
 *
 */
ObjectRenderer.prototype.render = function (object) // jshint unused:false
{
    // render the object
};

},{"../managers/WebGLManager":28}],34:[function(require,module,exports){
/**
 * Helper class to create a quad
 * @class
 * @memberof PIXI
 * @param gl {WebGLRenderingContext} The gl context for this quad to use.
 */
function Quad(gl)
{
    /*
     * the current WebGL drawing context
     *
     * @member {WebGLRenderingContext}
     */
    this.gl = gl;

//    this.textures = new TextureUvs();

    /**
     * An array of vertices
     *
     * @member {Float32Array}
     */
    this.vertices = new Float32Array([
        0,0,
        200,0,
        200,200,
        0,200
    ]);

    /**
     * The Uvs of the quad
     *
     * @member {Float32Array}
     */
    this.uvs = new Float32Array([
        0,0,
        1,0,
        1,1,
        0,1
    ]);

//    var white = (0xFFFFFF >> 16) + (0xFFFFFF & 0xff00) + ((0xFFFFFF & 0xff) << 16) + (1 * 255 << 24);
    //TODO convert this to a 32 unsigned int array
    /**
     * The color components of the triangles
     *
     * @member {Float32Array}
     */
    this.colors = new Float32Array([
        1,1,1,1,
        1,1,1,1,
        1,1,1,1,
        1,1,1,1
    ]);

    /*
     * @member {Uint16Array} An array containing the indices of the vertices
     */
    this.indices = new Uint16Array([
        0, 1, 2, 0, 3, 2
    ]);

    /*
     * @member {WebGLBuffer} The vertex buffer
     */
    this.vertexBuffer = gl.createBuffer();

    /*
     * @member {WebGLBuffer} The index buffer
     */
    this.indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, (8 + 8 + 16) * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    this.upload();
}

Quad.prototype.constructor = Quad;

/**
 * Maps two Rectangle to the quad
 * @param rect {Rectangle} the first rectangle
 * @param rect2 {Rectangle} the second rectangle
 */
Quad.prototype.map = function(rect, rect2)
{
    var x = 0; //rect2.x / rect.width;
    var y = 0; //rect2.y / rect.height;

    this.uvs[0] = x;
    this.uvs[1] = y;

    this.uvs[2] = x + rect2.width / rect.width;
    this.uvs[3] = y;

    this.uvs[4] = x + rect2.width / rect.width;
    this.uvs[5] = y + rect2.height / rect.height;

    this.uvs[6] = x;
    this.uvs[7] = y + rect2.height / rect.height;

    /// -----
    x = rect2.x;
    y = rect2.y;

    this.vertices[0] = x;
    this.vertices[1] = y;

    this.vertices[2] = x + rect2.width;
    this.vertices[3] = y;

    this.vertices[4] = x + rect2.width;
    this.vertices[5] = y + rect2.height;

    this.vertices[6] = x;
    this.vertices[7] = y + rect2.height;

    this.upload();
};

/**
 * Binds the buffer and uploads the data
 */
Quad.prototype.upload = function()
{
    var gl = this.gl;

    // TODO could probably be pushed into one upload!
    gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);

    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * 4, this.uvs);

    gl.bufferSubData(gl.ARRAY_BUFFER, (8 + 8) * 4, this.colors);
};

module.exports = Quad;



},{}],35:[function(require,module,exports){
var math = require('../../../math'),
    utils = require('../../../utils'),
    CONST = require('../../../const'),
    //StencilManager = require('../managers/StencilManager'),
    StencilMaskStack = require('./StencilMaskStack');

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * @class
 * @memberof PIXI
 * @param gl {WebGLRenderingContext} the current WebGL drawing context
 * @param width {number} the horizontal range of the filter
 * @param height {number} the vertical range of the filter
 * @param scaleMode {number} See {{#crossLink "PIXI/scaleModes:property"}}PIXI.scaleModes{{/crossLink}} for possible values
 * @param resolution {number} the current resolution
 * @param root {boolean} Whether this object is the root element or not
 */
var RenderTarget = function(gl, width, height, scaleMode, resolution, root)
{
    //TODO Resolution could go here ( eg low res blurs )

    /**
     * The current WebGL drawing context
     * @member {WebGLRenderingContext}
     */
    this.gl = gl;

    // next time to create a frame buffer and texture

    /**
     * A frame buffer
     * @member {WebGLFrameBuffer}
     */
    this.frameBuffer = null;

    /**
     * @member {Texture}
     */
    this.texture = null;

    /**
     * The size of the object as a rectangle
     * @member {Rectangle}
     */
    this.size = new math.Rectangle(0, 0, 1, 1);

    /**
     * The current resolution
     * @member {number}
     */
    this.resolution = resolution || CONST.RESOLUTION;

    /**
     * The projection matrix
     * @member {Matrix}
     */
    this.projectionMatrix = new math.Matrix();

    /**
     * The object's transform
     * @member {Matrix}
     */
    this.transform = null;

    /**
     *
     * @member {Rectangle}
     */
    this.frame = null;

    /**
     * The stencil buffer stores masking data for the render target
     * @member {WebGLRenderBuffer}
     */
    this.stencilBuffer = null;

    /**
     * The data structure for the stencil masks
     * @member {StencilMaskStack}
     */
    this.stencilMaskStack = new StencilMaskStack();

    /**
     * Stores filter data for the render target
     * @member {Array}
     */
    this.filterStack = [
        {
            renderTarget:this,
            filter:[],
            bounds:this.size
        }
    ];


    /**
     * The scale mode
     * @member {number}
     * @default CONST.SCALE_MODES.DEFAULT
     */
    this.scaleMode = scaleMode || CONST.SCALE_MODES.DEFAULT;

    /**
     * Whether this object is the root element or not
     * @member {boolean}
     */
    this.root = root;

    if (!this.root)
    {
       // this.flipY = true;
        this.frameBuffer = gl.createFramebuffer();

        /*
            A frame buffer needs a target to render to..
            create a texture and bind it attach it to the framebuffer..
         */

        this.texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D,  this.texture);

        // set the scale properties of the texture..
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, scaleMode === CONST.SCALE_MODES.LINEAR ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, scaleMode === CONST.SCALE_MODES.LINEAR ? gl.LINEAR : gl.NEAREST);

        // check to see if the texture is a power of two!
        var isPowerOfTwo = utils.isPowerOfTwo(width, height);

        //TODO for 99% of use cases if a texture is power of two we should tile the texture...
         if (!isPowerOfTwo)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else
        {

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer );
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    }


    this.resize(width, height);
};

RenderTarget.prototype.constructor = RenderTarget;
module.exports = RenderTarget;

/**
* Clears the filter texture.
*
*/
RenderTarget.prototype.clear = function(bind)
{
    var gl = this.gl;
    if(bind)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    }

    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

/**
* Binds the stencil buffer.
*
*/
RenderTarget.prototype.attachStencilBuffer = function()
{

    if ( this.stencilBuffer )
    {
        return;
    }

    /*
        The stencil buffer is used for masking in pixi
        lets create one and then add attach it to the framebuffer..
     */
    if (!this.root)
    {
        var gl = this.gl;

        this.stencilBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencilBuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.stencilBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL,  this.size.width * this.resolution  , this.size.height * this.resolution );
    }
};

/**
* Binds the buffers and initialises the viewport.
*
*/
RenderTarget.prototype.activate = function()
{
    //TOOD refactor usage of frame..
    var gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

    var projectionFrame = this.frame || this.size;

    // TODO add a dirty flag to this of a setter for the frame?
    this.calculateProjection( projectionFrame );

    if(this.transform)
    {
        this.projectionMatrix.append(this.transform);
    }

    gl.viewport(0,0, projectionFrame.width * this.resolution, projectionFrame.height * this.resolution);
};

/**
* Updates the projection matrix based on a projection frame (which is a rectangle)
*
*/
RenderTarget.prototype.calculateProjection = function( projectionFrame )
{
    var pm = this.projectionMatrix;

    pm.identity();

    if (!this.root)
    {
        pm.a = 1 / projectionFrame.width*2;
        pm.d = 1 / projectionFrame.height*2;

        pm.tx = -1 - projectionFrame.x * pm.a;
        pm.ty = -1 - projectionFrame.y * pm.d;
    }
    else
    {
        pm.a = 1 / projectionFrame.width*2;
        pm.d = -1 / projectionFrame.height*2;

        pm.tx = -1 - projectionFrame.x * pm.a;
        pm.ty = 1 - projectionFrame.y * pm.d;
    }
};


/**
 * Resizes the texture to the specified width and height
 *
 * @param width {Number} the new width of the texture
 * @param height {Number} the new height of the texture
 */
RenderTarget.prototype.resize = function(width, height)
{
    width = width | 0;
    height = height | 0;

    if (this.size.width === width && this.size.height === height) {
        return;
    }

    this.size.width = width;
    this.size.height = height;

    if (!this.root)
    {
        var gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D,  this.texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  width * this.resolution, height * this.resolution , 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        if (this.stencilBuffer )
        {
            // update the stencil buffer width and height
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencilBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL,  width * this.resolution, height * this.resolution );
        }
    }

    var projectionFrame = this.frame || this.size;

    this.calculateProjection( projectionFrame );
};

/**
 * Destroys the render target.
 *
 */
RenderTarget.prototype.destroy = function()
{
    var gl = this.gl;
    gl.deleteFramebuffer( this.frameBuffer );
    gl.deleteTexture( this.texture );

    this.frameBuffer = null;
    this.texture = null;
};

},{"../../../const":6,"../../../math":12,"../../../utils":46,"./StencilMaskStack":36}],36:[function(require,module,exports){
/**
 * Generic Mask Stack data structure
 * @class
 * @memberof PIXI
 * @param renderer {WebGLRenderer} The renderer this manager works for.
 */
function StencilMaskStack()
{
	/**
     * The actual stack
     *
     * @member {Array}
     */
    this.stencilStack = [];

    /**
     * TODO @alvin
     *
     * @member {boolean}
     */
    this.reverse = true;

    /**
     * Internal count
     *
     * @member {number}
     */
    this.count = 0;
}

StencilMaskStack.prototype.constructor = StencilMaskStack;
module.exports = StencilMaskStack;

},{}],37:[function(require,module,exports){
var math = require('../math'),
    Texture = require('../textures/Texture'),
    Container = require('../display/Container'),
    CanvasTinter = require('../renderers/canvas/utils/CanvasTinter'),
    utils = require('../utils'),
    CONST = require('../const'),
    tempPoint = new math.Point();

/**
 * The Sprite object is the base for all textured objects that are rendered to the screen
 *
 * A sprite can be created directly from an image like this:
 *
 * ```js
 * var sprite = new PIXI.Sprite.fromImage('assets/image.png');
 * ```
 *
 * @class
 * @extends PIXI.Container
 * @memberof PIXI
 * @param texture {Texture} The texture for this sprite
 */
function Sprite(texture)
{
    Container.call(this);

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 this means the texture's origin is the top left
     * Setting the anchor to 0.5,0.5 means the texture's origin is centered
     * Setting the anchor to 1,1 would mean the texture's origin point will be the bottom right corner
     *
     * @member {Point}
     */
    this.anchor = new math.Point();

    /**
     * The texture that the sprite is using
     *
     * @member {Texture}
     * @private
     */
    this._texture = null;

    /**
     * The width of the sprite (this is initially set by the texture)
     *
     * @member {number}
     * @private
     */
    this._width = 0;

    /**
     * The height of the sprite (this is initially set by the texture)
     *
     * @member {number}
     * @private
     */
    this._height = 0;

    /**
     * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
     *
     * @member {number}
     * @default [0xFFFFFF]
     */
    this.tint = 0xFFFFFF;

    /**
     * The blend mode to be applied to the sprite. Apply a value of blendModes.NORMAL to reset the blend mode.
     *
     * @member {number}
     * @default CONST.BLEND_MODES.NORMAL;
     */
    this.blendMode = CONST.BLEND_MODES.NORMAL;

    /**
     * The shader that will be used to render the sprite. Set to null to remove a current shader.
     *
     * @member {AbstractFilter}
     */
    this.shader = null;

    /**
     * An internal cached value of the tint.
     *
     * @member {number}
     * @default [0xFFFFFF]
     */
    this.cachedTint = 0xFFFFFF;

    // call texture setter
    this.texture = texture || Texture.EMPTY;
}

// constructor
Sprite.prototype = Object.create(Container.prototype);
Sprite.prototype.constructor = Sprite;
module.exports = Sprite;

Object.defineProperties(Sprite.prototype, {
    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Sprite#
     */
    width: {
        get: function ()
        {
            return this.scale.x * this.texture._frame.width;
        },
        set: function (value)
        {
            this.scale.x = value / this.texture._frame.width;
            this._width = value;
        }
    },

    /**
     * The height of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Sprite#
     */
    height: {
        get: function ()
        {
            return  this.scale.y * this.texture._frame.height;
        },
        set: function (value)
        {
            this.scale.y = value / this.texture._frame.height;
            this._height = value;
        }
    },

    /**
     * The texture that the sprite is using
     *
     * @member {PIXI.Texture}
     * @memberof PIXI.Sprite#
     */
    texture: {
        get: function ()
        {
            return  this._texture;
        },
        set: function (value)
        {
            if (this._texture === value)
            {
                return;
            }

            this._texture = value;
            this.cachedTint = 0xFFFFFF;

            if (value)
            {
                // wait for the texture to load
                if (value.baseTexture.hasLoaded)
                {
                    this._onTextureUpdate();
                }
                else
                {
                    value.once('update', this._onTextureUpdate, this);
                }
            }
        }
    }
});

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @private
 */
Sprite.prototype._onTextureUpdate = function ()
{
    // so if _width is 0 then width was not set..
    if (this._width)
    {
        this.scale.x = this._width / this.texture.frame.width;
    }

    if (this._height)
    {
        this.scale.y = this._height / this.texture.frame.height;
    }
};

/**
*
* Renders the object using the WebGL renderer
*
* @param renderer {WebGLRenderer}
* @private
*/
Sprite.prototype._renderWebGL = function (renderer)
{
    renderer.setObjectRenderer(renderer.plugins.sprite);
    renderer.plugins.sprite.render(this);
};

/**
 * Returns the bounds of the Sprite as a rectangle. The bounds calculation takes the worldTransform into account.
 *
 * @param matrix {Matrix} the transformation matrix of the sprite
 * @return {Rectangle} the framing rectangle
 */
Sprite.prototype.getBounds = function (matrix)
{
    if(!this._currentBounds)
    {

        var width = this._texture._frame.width;
        var height = this._texture._frame.height;

        var w0 = width * (1-this.anchor.x);
        var w1 = width * -this.anchor.x;

        var h0 = height * (1-this.anchor.y);
        var h1 = height * -this.anchor.y;

        var worldTransform = matrix || this.worldTransform ;

        var a = worldTransform.a;
        var b = worldTransform.b;
        var c = worldTransform.c;
        var d = worldTransform.d;
        var tx = worldTransform.tx;
        var ty = worldTransform.ty;

        var minX,
            maxX,
            minY,
            maxY;


        if (b === 0 && c === 0)
        {
            // scale may be negative!
            if (a < 0)
            {
                a *= -1;
            }

            if (d < 0)
            {
                d *= -1;
            }

            // this means there is no rotation going on right? RIGHT?
            // if thats the case then we can avoid checking the bound values! yay
            minX = a * w1 + tx;
            maxX = a * w0 + tx;
            minY = d * h1 + ty;
            maxY = d * h0 + ty;
        }
        else
        {
            var x1 = a * w1 + c * h1 + tx;
            var y1 = d * h1 + b * w1 + ty;

            var x2 = a * w0 + c * h1 + tx;
            var y2 = d * h1 + b * w0 + ty;

            var x3 = a * w0 + c * h0 + tx;
            var y3 = d * h0 + b * w0 + ty;

            var x4 =  a * w1 + c * h0 + tx;
            var y4 =  d * h0 + b * w1 + ty;

            minX = x1;
            minX = x2 < minX ? x2 : minX;
            minX = x3 < minX ? x3 : minX;
            minX = x4 < minX ? x4 : minX;

            minY = y1;
            minY = y2 < minY ? y2 : minY;
            minY = y3 < minY ? y3 : minY;
            minY = y4 < minY ? y4 : minY;

            maxX = x1;
            maxX = x2 > maxX ? x2 : maxX;
            maxX = x3 > maxX ? x3 : maxX;
            maxX = x4 > maxX ? x4 : maxX;

            maxY = y1;
            maxY = y2 > maxY ? y2 : maxY;
            maxY = y3 > maxY ? y3 : maxY;
            maxY = y4 > maxY ? y4 : maxY;
        }

        // check for children
        if(this.children.length)
        {
            var childBounds = this.containerGetBounds();

            w0 = childBounds.x;
            w1 = childBounds.x + childBounds.width;
            h0 = childBounds.y;
            h1 = childBounds.y + childBounds.height;

            minX = (minX < w0) ? minX : w0;
            minY = (minY < h0) ? minY : h0;

            maxX = (maxX > w1) ? maxX : w1;
            maxY = (maxY > h1) ? maxY : h1;
        }

        var bounds = this._bounds;

        bounds.x = minX;
        bounds.width = maxX - minX;

        bounds.y = minY;
        bounds.height = maxY - minY;

        // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
        this._currentBounds = bounds;
    }

    return this._currentBounds;
};

Sprite.prototype.getLocalBounds = function ()
{
    this._bounds.x = -this._texture._frame.width * this.anchor.x;
    this._bounds.y = -this._texture._frame.height * this.anchor.y;
    this._bounds.width = this._texture._frame.width;
    this._bounds.height = this._texture._frame.height;
    return this._bounds;
};

/**
* Tests if a point is inside this sprite
*
* @param point {Point} the point to test
* @return {boolean} the result of the test
*/
Sprite.prototype.containsPoint = function( point )
{
    this.worldTransform.applyInverse(point,  tempPoint);

    var width = this._texture._frame.width;
    var height = this._texture._frame.height;
    var x1 = -width * this.anchor.x;
    var y1;

    if ( tempPoint.x > x1 && tempPoint.x < x1 + width )
    {
        y1 = -height * this.anchor.y;

        if ( tempPoint.y > y1 && tempPoint.y < y1 + height )
        {
            return true;
        }
    }

    return false;
};

/**
* Renders the object using the Canvas renderer
*
* @param renderer {CanvasRenderer} The renderer
* @private
*/
Sprite.prototype._renderCanvas = function (renderer)
{
    if (this.texture.crop.width <= 0 || this.texture.crop.height <= 0)
    {
        return;
    }

    if (this.blendMode !== renderer.currentBlendMode)
    {
        renderer.currentBlendMode = this.blendMode;
        renderer.context.globalCompositeOperation = renderer.blendModes[renderer.currentBlendMode];
    }

    //  Ignore null sources
    if (this.texture.valid)
    {
        var texture = this._texture,
            wt = this.worldTransform,
            dx,
            dy,
            width,
            height;

        renderer.context.globalAlpha = this.worldAlpha;

        // If smoothingEnabled is supported and we need to change the smoothing property for this texture
        if (renderer.smoothProperty && renderer.currentScaleMode !== texture.baseTexture.scaleMode)
        {
            renderer.currentScaleMode = texture.baseTexture.scaleMode;
            renderer.context[renderer.smoothProperty] = (renderer.currentScaleMode === CONST.SCALE_MODES.LINEAR);
        }

        // If the texture is trimmed we offset by the trim x/y, otherwise we use the frame dimensions

        if(texture.rotate)
        {

            // cheeky rotation!
            var a = wt.a;
            var b = wt.b;

            wt.a  = -wt.c;
            wt.b  = -wt.d;
            wt.c  =  a;
            wt.d  =  b;

            width = texture.crop.height;
            height = texture.crop.width;

            dx = (texture.trim) ? texture.trim.y - this.anchor.y * texture.trim.height : this.anchor.y * -texture._frame.height;
            dy = (texture.trim) ? texture.trim.x - this.anchor.x * texture.trim.width : this.anchor.x * -texture._frame.width;
        }
        else
        {
            width = texture.crop.width;
            height = texture.crop.height;

            dx = (texture.trim) ? texture.trim.x - this.anchor.x * texture.trim.width : this.anchor.x * -texture._frame.width;
            dy = (texture.trim) ? texture.trim.y - this.anchor.y * texture.trim.height : this.anchor.y * -texture._frame.height;
        }



        // Allow for pixel rounding
        if (renderer.roundPixels)
        {
            renderer.context.setTransform(
                wt.a,
                wt.b,
                wt.c,
                wt.d,
                (wt.tx * renderer.resolution) | 0,
                (wt.ty * renderer.resolution) | 0
            );

            dx = dx | 0;
            dy = dy | 0;
        }
        else
        {

            renderer.context.setTransform(
                wt.a,
                wt.b,
                wt.c,
                wt.d,
                wt.tx * renderer.resolution,
                wt.ty * renderer.resolution
            );


        }

        var resolution = texture.baseTexture.resolution;

        if (this.tint !== 0xFFFFFF)
        {
            if (this.cachedTint !== this.tint)
            {
                this.cachedTint = this.tint;

                // TODO clean up caching - how to clean up the caches?
                this.tintedTexture = CanvasTinter.getTintedTexture(this, this.tint);
            }

            renderer.context.drawImage(
                this.tintedTexture,
                0,
                0,
                width * resolution,
                height * resolution,
                dx * renderer.resolution,
                dy * renderer.resolution,
                width * renderer.resolution,
                height * renderer.resolution
            );
        }
        else
        {
            renderer.context.drawImage(
                texture.baseTexture.source,
                texture.crop.x * resolution,
                texture.crop.y * resolution,
                width * resolution,
                height * resolution,
                dx  * renderer.resolution,
                dy  * renderer.resolution,
                width * renderer.resolution,
                height * renderer.resolution
            );
        }
    }
};

/**
 * Destroys this sprite and optionally its texture
 *
 * @param [destroyTexture=false] {boolean} Should it destroy the current texture of the sprite as well
 * @param [destroyBaseTexture=false] {boolean} Should it destroy the base texture of the sprite as well
 */
Sprite.prototype.destroy = function (destroyTexture, destroyBaseTexture)
{
    Container.prototype.destroy.call(this);

    this.anchor = null;

    if (destroyTexture)
    {
        this._texture.destroy(destroyBaseTexture);
    }

    this._texture = null;
    this.shader = null;
};

// some helper functions..

/**
 * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
 * The frame ids are created when a Texture packer file has been loaded
 *
 * @static
 * @param frameId {String} The frame Id of the texture in the cache
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the frameId
 * @param [crossorigin=(auto)] {boolean} if you want to specify the cross-origin parameter
 * @param [scaleMode=scaleModes.DEFAULT] {number} if you want to specify the scale mode, see {@link SCALE_MODES} for possible values
 */
Sprite.fromFrame = function (frameId)
{
    var texture = utils.TextureCache[frameId];

    if (!texture)
    {
        throw new Error('The frameId "' + frameId + '" does not exist in the texture cache');
    }

    return new Sprite(texture);
};

/**
 * Helper function that creates a sprite that will contain a texture based on an image url
 * If the image is not in the texture cache it will be loaded
 *
 * @static
 * @param imageId {String} The image url of the texture
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the image id
 */
Sprite.fromImage = function (imageId, crossorigin, scaleMode)
{
    return new Sprite(Texture.fromImage(imageId, crossorigin, scaleMode));
};

},{"../const":6,"../display/Container":7,"../math":12,"../renderers/canvas/utils/CanvasTinter":18,"../textures/Texture":41,"../utils":46}],38:[function(require,module,exports){
var ObjectRenderer = require('../../renderers/webgl/utils/ObjectRenderer'),
    WebGLRenderer = require('../../renderers/webgl/WebGLRenderer'),
    CONST = require('../../const');

/**
 * @author Mat Groves
 *
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 * Also a thanks to https://github.com/bchevalier for tweaking the tint and alpha so that they now share 4 bytes on the vertex buffer
 *
 * Heavily inspired by LibGDX's SpriteRenderer:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/SpriteRenderer.java
 */

/**
 *
 * @class
 * @private
 * @memberof PIXI
 * @extends PIXI.ObjectRenderer
 * @param renderer {WebGLRenderer} The renderer this sprite batch works for.
 */
function SpriteRenderer(renderer)
{
    ObjectRenderer.call(this, renderer);

    /**
     * Number of values sent in the vertex buffer.
     * positionX, positionY, colorR, colorG, colorB = 5
     *
     * @member {number}
     */
    this.vertSize = 5;

    /**
     * The size of the vertex information in bytes.
     *
     * @member {number}
     */
    this.vertByteSize = this.vertSize * 4;

    /**
     * The number of images in the SpriteBatch before it flushes.
     *
     * @member {number}
     */
    this.size = CONST.SPRITE_BATCH_SIZE; // 2000 is a nice balance between mobile / desktop

    // the total number of bytes in our batch
    var numVerts = (this.size * 4) * this.vertByteSize;

    // the total number of indices in our batch, there are 6 points per quad.
    var numIndices = this.size * 6;

    /**
     * Holds the vertex data that will be sent to the vertex shader.
     *
     * @member {ArrayBuffer}
     */
    this.vertices = new ArrayBuffer(numVerts);

    /**
     * View on the vertices as a Float32Array for positions
     *
     * @member {Float32Array}
     */
    this.positions = new Float32Array(this.vertices);

    /**
     * View on the vertices as a Uint32Array for colors
     *
     * @member {Uint32Array}
     */
    this.colors = new Uint32Array(this.vertices);

    /**
     * Holds the indices of the geometry (quads) to draw
     *
     * @member {Uint16Array}
     */
    this.indices = new Uint16Array(numIndices);

    // fill the indices with the quads to draw
    for (var i=0, j=0; i < numIndices; i += 6, j += 4)
    {
        this.indices[i + 0] = j + 0;
        this.indices[i + 1] = j + 1;
        this.indices[i + 2] = j + 2;
        this.indices[i + 3] = j + 0;
        this.indices[i + 4] = j + 2;
        this.indices[i + 5] = j + 3;
    }

    /**
     * The current size of the batch, each render() call adds to this number.
     *
     * @member {number}
     */
    this.currentBatchSize = 0;

    /**
     * The current sprites in the batch.
     *
     * @member {Array}
     */
    this.sprites = [];

    /**
     * The default shader that is used if a sprite doesn't have a more specific one.
     *
     * @member {Shader}
     */
    this.shader = null;

}

SpriteRenderer.prototype = Object.create(ObjectRenderer.prototype);
SpriteRenderer.prototype.constructor = SpriteRenderer;
module.exports = SpriteRenderer;

WebGLRenderer.registerPlugin('sprite', SpriteRenderer);

/**
 * Sets up the renderer context and necessary buffers.
 *
 * @private
 * @param gl {WebGLRenderingContext} the current WebGL drawing context
 */
SpriteRenderer.prototype.onContextChange = function ()
{
    var gl = this.renderer.gl;

    // setup default shader
    this.shader = this.renderer.shaderManager.defaultShader;

    // create a couple of buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    //upload the index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    this.currentBlendMode = 99999;
};

/**
 * Renders the sprite object.
 *
 * @param sprite {Sprite} the sprite to render when using this spritebatch
 */
SpriteRenderer.prototype.render = function (sprite)
{
    var texture = sprite._texture;

    //TODO set blend modes..
    // check texture..
    if (this.currentBatchSize >= this.size)
    {
        this.flush();
    }

    // get the uvs for the texture
    var uvs = texture._uvs;

    // if the uvs have not updated then no point rendering just yet!
    if (!uvs)
    {
        return;
    }

    // TODO trim??
    var aX = sprite.anchor.x;
    var aY = sprite.anchor.y;

    var w0, w1, h0, h1;

    if (texture.trim)
    {
        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
        var trim = texture.trim;

        w1 = trim.x - aX * trim.width;
        w0 = w1 + texture.crop.width;

        h1 = trim.y - aY * trim.height;
        h0 = h1 + texture.crop.height;

    }
    else
    {
        w0 = (texture._frame.width ) * (1-aX);
        w1 = (texture._frame.width ) * -aX;

        h0 = texture._frame.height * (1-aY);
        h1 = texture._frame.height * -aY;
    }

    var index = this.currentBatchSize * this.vertByteSize;

    var worldTransform = sprite.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.b;
    var c = worldTransform.c;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var colors = this.colors;
    var positions = this.positions;

    if (this.renderer.roundPixels)
    {
        // xy
        positions[index] = a * w1 + c * h1 + tx | 0;
        positions[index+1] = d * h1 + b * w1 + ty | 0;

        // xy
        positions[index+5] = a * w0 + c * h1 + tx | 0;
        positions[index+6] = d * h1 + b * w0 + ty | 0;

         // xy
        positions[index+10] = a * w0 + c * h0 + tx | 0;
        positions[index+11] = d * h0 + b * w0 + ty | 0;

        // xy
        positions[index+15] = a * w1 + c * h0 + tx | 0;
        positions[index+16] = d * h0 + b * w1 + ty | 0;
    }
    else
    {
        // xy
        positions[index] = a * w1 + c * h1 + tx;
        positions[index+1] = d * h1 + b * w1 + ty;

        // xy
        positions[index+5] = a * w0 + c * h1 + tx;
        positions[index+6] = d * h1 + b * w0 + ty;

         // xy
        positions[index+10] = a * w0 + c * h0 + tx;
        positions[index+11] = d * h0 + b * w0 + ty;

        // xy
        positions[index+15] = a * w1 + c * h0 + tx;
        positions[index+16] = d * h0 + b * w1 + ty;
    }

    // uv
    positions[index+2] = uvs.x0;
    positions[index+3] = uvs.y0;

    // uv
    positions[index+7] = uvs.x1;
    positions[index+8] = uvs.y1;

     // uv
    positions[index+12] = uvs.x2;
    positions[index+13] = uvs.y2;

    // uv
    positions[index+17] = uvs.x3;
    positions[index+18] = uvs.y3;

    // color and alpha
    var tint = sprite.tint;
    colors[index+4] = colors[index+9] = colors[index+14] = colors[index+19] = (tint >> 16) + (tint & 0xff00) + ((tint & 0xff) << 16) + (sprite.worldAlpha * 255 << 24);

    // increment the batchsize
    this.sprites[this.currentBatchSize++] = sprite;
};

/**
 * Renders the content and empties the current batch.
 *
 */
SpriteRenderer.prototype.flush = function ()
{
    // If the batch is length 0 then return as there is nothing to draw
    if (this.currentBatchSize === 0)
    {
        return;
    }

    var gl = this.renderer.gl;
    var shader;

    // upload the verts to the buffer
    if (this.currentBatchSize > ( this.size * 0.5 ) )
    {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    }
    else
    {
        var view = this.positions.subarray(0, this.currentBatchSize * this.vertByteSize);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    }

    var nextTexture, nextBlendMode, nextShader;
    var batchSize = 0;
    var start = 0;

    var currentBaseTexture = null;
    var currentBlendMode = this.renderer.blendModeManager.currentBlendMode;
    var currentShader = null;

    var blendSwap = false;
    var shaderSwap = false;
    var sprite;

    for (var i = 0, j = this.currentBatchSize; i < j; i++)
    {

        sprite = this.sprites[i];

        nextTexture = sprite._texture.baseTexture;
        nextBlendMode = sprite.blendMode;
        nextShader = sprite.shader || this.shader;

        blendSwap = currentBlendMode !== nextBlendMode;
        shaderSwap = currentShader !== nextShader; // should I use uidS???

        if (currentBaseTexture !== nextTexture || blendSwap || shaderSwap)
        {
            this.renderBatch(currentBaseTexture, batchSize, start);

            start = i;
            batchSize = 0;
            currentBaseTexture = nextTexture;

            if (blendSwap)
            {
                currentBlendMode = nextBlendMode;
                this.renderer.blendModeManager.setBlendMode( currentBlendMode );
            }

            if (shaderSwap)
            {
                currentShader = nextShader;



                shader = currentShader.shaders ? currentShader.shaders[gl.id] : currentShader;

                if (!shader)
                {
                    shader = currentShader.getShader(this.renderer);

                }

                // set shader function???
                this.renderer.shaderManager.setShader(shader);

                //TODO - i KNOW this can be optimised! Once v3 is stable il look at this next...
                shader.uniforms.projectionMatrix.value = this.renderer.currentRenderTarget.projectionMatrix.toArray(true);
                //Make this a little more dynamic / intelligent!
                shader.syncUniforms();

                //TODO investigate some kind of texture state managment??
                // need to make sure this texture is the active one for all the batch swaps..
                gl.activeTexture(gl.TEXTURE0);

                // both thease only need to be set if they are changing..
                // set the projection
                //gl.uniformMatrix3fv(shader.uniforms.projectionMatrix._location, false, this.renderer.currentRenderTarget.projectionMatrix.toArray(true));


            }
        }

        batchSize++;
    }

    this.renderBatch(currentBaseTexture, batchSize, start);

    // then reset the batch!
    this.currentBatchSize = 0;
};

/**
 * Draws the currently batches sprites.
 *
 * @private
 * @param texture {Texture}
 * @param size {number}
 * @param startIndex {number}
 */
SpriteRenderer.prototype.renderBatch = function (texture, size, startIndex)
{
    if (size === 0)
    {
        return;
    }

    var gl = this.renderer.gl;

    if (!texture._glTextures[gl.id])
    {
        this.renderer.updateTexture(texture);
    }
    else
    {
        // bind the current texture
        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
    }

    // now draw those suckas!
    gl.drawElements(gl.TRIANGLES, size * 6, gl.UNSIGNED_SHORT, startIndex * 6 * 2);

    // increment the draw count
    this.renderer.drawCount++;
};

/**
 * Starts a new sprite batch.
 *
 */
SpriteRenderer.prototype.start = function ()
{
    var gl = this.renderer.gl;

    // bind the main texture


    // bind the buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // this is the same for each shader?
    var stride =  this.vertByteSize;
    gl.vertexAttribPointer(this.shader.attributes.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.shader.attributes.aTextureCoord, 2, gl.FLOAT, false, stride, 2 * 4);

    // color attributes will be interpreted as unsigned bytes and normalized
    gl.vertexAttribPointer(this.shader.attributes.aColor, 4, gl.UNSIGNED_BYTE, true, stride, 4 * 4);
};

/**
 * Destroys the SpriteBatch.
 *
 */
SpriteRenderer.prototype.destroy = function ()
{
    this.renderer.gl.deleteBuffer(this.vertexBuffer);
    this.renderer.gl.deleteBuffer(this.indexBuffer);

    this.shader.destroy();

    this.renderer = null;

    this.vertices = null;
    this.positions = null;
    this.colors = null;
    this.indices = null;

    this.vertexBuffer = null;
    this.indexBuffer = null;

    this.sprites = null;
    this.shader = null;
};

},{"../../const":6,"../../renderers/webgl/WebGLRenderer":19,"../../renderers/webgl/utils/ObjectRenderer":33}],39:[function(require,module,exports){
var utils = require('../utils'),
    CONST = require('../const'),
    EventEmitter = require('eventemitter3');

/**
 * A texture stores the information that represents an image. All textures have a base texture.
 *
 * @class
 * @memberof PIXI
 * @param source {Image|Canvas} the source object of the texture.
 * @param [scaleMode=scaleModes.DEFAULT] {number} See {@link SCALE_MODES} for possible values
 * @param resolution {number} the resolution of the texture for devices with different pixel ratios
 */
function BaseTexture(source, scaleMode, resolution)
{
    EventEmitter.call(this);

    this.uid = utils.uid();

    /**
     * The Resolution of the texture.
     *
     * @member {number}
     */
    this.resolution = resolution || 1;

    /**
     * The width of the base texture set when the image has loaded
     *
     * @member {number}
     * @readOnly
     */
    this.width = 100;

    /**
     * The height of the base texture set when the image has loaded
     *
     * @member {number}
     * @readOnly
     */
    this.height = 100;

    // TODO docs
    // used to store the actual dimensions of the source
    /**
     * Used to store the actual width of the source of this texture
     *
     * @member {number}
     * @readOnly
     */
    this.realWidth = 100;
    /**
     * Used to store the actual height of the source of this texture
     *
     * @member {number}
     * @readOnly
     */
    this.realHeight = 100;

    /**
     * The scale mode to apply when scaling this texture
     *
     * @member {{number}}
     * @default scaleModes.LINEAR
     */
    this.scaleMode = scaleMode || CONST.SCALE_MODES.DEFAULT;

    /**
     * Set to true once the base texture has successfully loaded.
     *
     * This is never true if the underlying source fails to load or has no texture data.
     *
     * @member {boolean}
     * @readOnly
     */
    this.hasLoaded = false;

    /**
     * Set to true if the source is currently loading.
     *
     * If an Image source is loading the 'loaded' or 'error' event will be
     * dispatched when the operation ends. An underyling source that is
     * immediately-available bypasses loading entirely.
     *
     * @member {boolean}
     * @readonly
     */
    this.isLoading = false;

    /**
     * The image source that is used to create the texture.
     *
     * TODO: Make this a setter that calls loadSource();
     *
     * @member {Image|Canvas}
     * @readonly
     */
    this.source = null; // set in loadSource, if at all

    /**
     * Controls if RGB channels should be pre-multiplied by Alpha  (WebGL only)
     *
     * @member {boolean}
     * @default true
     */
    this.premultipliedAlpha = true;

    /**
     * @member {string}
     */
    this.imageUrl = null;

    /**
     * Wether or not the texture is a power of two, try to use power of two textures as much as you can
     * @member {boolean}
     * @private
     */
    this.isPowerOfTwo = false;

    // used for webGL

    /**
     *
     * Set this to true if a mipmap of this texture needs to be generated. This value needs to be set before the texture is used
     * Also the texture must be a power of two size to work
     *
     * @member {boolean}
     */
    this.mipmap = false;

    /**
     * A map of renderer IDs to webgl textures
     *
     * @member {object<number, WebGLTexture>}
     * @private
     */
    this._glTextures = [];

    // if no source passed don't try to load
    if (source)
    {
        this.loadSource(source);
    }

    /**
     * Fired when a not-immediately-available source finishes loading.
     *
     * @event loaded
     * @memberof PIXI.BaseTexture#
     * @protected
     */

    /**
     * Fired when a not-immediately-available source fails to load.
     *
     * @event error
     * @memberof PIXI.BaseTexture#
     * @protected
     */
}

BaseTexture.prototype = Object.create(EventEmitter.prototype);
BaseTexture.prototype.constructor = BaseTexture;
module.exports = BaseTexture;

/**
 * Updates the texture on all the webgl renderers, this also assumes the src has changed.
 *
 * @fires update
 */
BaseTexture.prototype.update = function ()
{
    this.realWidth = this.source.naturalWidth || this.source.width;
    this.realHeight = this.source.naturalHeight || this.source.height;

    this.width = this.realWidth / this.resolution;
    this.height = this.realHeight / this.resolution;

    this.isPowerOfTwo = utils.isPowerOfTwo(this.realWidth, this.realHeight);

    this.emit('update', this);
};

/**
 * Load a source.
 *
 * If the source is not-immediately-available, such as an image that needs to be
 * downloaded, then the 'loaded' or 'error' event will be dispatched in the future
 * and `hasLoaded` will remain false after this call.
 *
 * The logic state after calling `loadSource` directly or indirectly (eg. `fromImage`, `new BaseTexture`) is:
 *
 *     if (texture.hasLoaded)
 {
 *        // texture ready for use
 *     } else if (texture.isLoading)
 {
 *        // listen to 'loaded' and/or 'error' events on texture
 *     } else {
 *        // not loading, not going to load UNLESS the source is reloaded
 *        // (it may still make sense to listen to the events)
 *     }
 *
 * @protected
 * @param source {Image|Canvas} the source object of the texture.
 */
BaseTexture.prototype.loadSource = function (source)
{
    var wasLoading = this.isLoading;
    this.hasLoaded = false;
    this.isLoading = false;

    if (wasLoading && this.source)
    {
        this.source.onload = null;
        this.source.onerror = null;
    }

    this.source = source;

    // Apply source if loaded. Otherwise setup appropriate loading monitors.
    if ((this.source.complete || this.source.getContext) && this.source.width && this.source.height)
    {
        this._sourceLoaded();
    }
    else if (!source.getContext)
    {

        // Image fail / not ready
        this.isLoading = true;

        var scope = this;

        source.onload = function ()
        {
            source.onload = null;
            source.onerror = null;

            if (!scope.isLoading)
            {
                return;
            }

            scope.isLoading = false;
            scope._sourceLoaded();

            scope.emit('loaded', scope);
        };

        source.onerror = function ()
        {
            source.onload = null;
            source.onerror = null;

            if (!scope.isLoading)
            {
                return;
            }

            scope.isLoading = false;
            scope.emit('error', scope);
        };

        // Per http://www.w3.org/TR/html5/embedded-content-0.html#the-img-element
        //   "The value of `complete` can thus change while a script is executing."
        // So complete needs to be re-checked after the callbacks have been added..
        // NOTE: complete will be true if the image has no src so best to check if the src is set.
        if (source.complete && source.src)
        {
            this.isLoading = false;

            // ..and if we're complete now, no need for callbacks
            source.onload = null;
            source.onerror = null;

            if (source.width && source.height)
            {
                this._sourceLoaded();

                // If any previous subscribers possible
                if (wasLoading)
                {
                    this.emit('loaded', this);
                }
            }
            else
            {
                // If any previous subscribers possible
                if (wasLoading)
                {
                    this.emit('error', this);
                }
            }
        }
    }
};

/**
 * Used internally to update the width, height, and some other tracking vars once
 * a source has successfully loaded.
 *
 * @private
 */
BaseTexture.prototype._sourceLoaded = function ()
{
    this.hasLoaded = true;
    this.update();
};

/**
 * Destroys this base texture
 *
 */
BaseTexture.prototype.destroy = function ()
{
    if (this.imageUrl)
    {
        delete utils.BaseTextureCache[this.imageUrl];
        delete utils.TextureCache[this.imageUrl];

        this.imageUrl = null;

        if (!navigator.isCocoonJS)
        {
            this.source.src = '';
        }
    }
    else if (this.source && this.source._pixiId)
    {
        delete utils.BaseTextureCache[this.source._pixiId];
    }

    this.source = null;

    this.dispose();
};

/**
 * Frees the texture from WebGL memory without destroying this texture object.
 * This means you can still use the texture later which will upload it to GPU
 * memory again.
 *
 */
BaseTexture.prototype.dispose = function ()
{
    this.emit('dispose', this);

    this._glTextures.length = 0;
};

/**
 * Changes the source image of the texture.
 * The original source must be an Image element.
 *
 * @param newSrc {string} the path of the image
 */
BaseTexture.prototype.updateSourceImage = function (newSrc)
{
    this.source.src = newSrc;

    this.loadSource(this.source);
};

/**
 * Helper function that creates a base texture from the given image url.
 * If the image is not in the base texture cache it will be created and loaded.
 *
 * @static
 * @param imageUrl {string} The image url of the texture
 * @param [crossorigin=(auto)] {boolean} Should use anonymous CORS? Defaults to true if the URL is not a data-URI.
 * @param [scaleMode=scaleModes.DEFAULT] {number} See {@link SCALE_MODES} for possible values
 * @return BaseTexture
 */
BaseTexture.fromImage = function (imageUrl, crossorigin, scaleMode)
{
    var baseTexture = utils.BaseTextureCache[imageUrl];

    if (crossorigin === undefined && imageUrl.indexOf('data:') !== 0)
    {
        crossorigin = true;
    }

    if (!baseTexture)
    {
        // new Image() breaks tex loading in some versions of Chrome.
        // See https://code.google.com/p/chromium/issues/detail?id=238071
        var image = new Image();//document.createElement('img');
        if (crossorigin)
        {
            image.crossOrigin = '';
        }

        baseTexture = new BaseTexture(image, scaleMode);
        baseTexture.imageUrl = imageUrl;

        image.src = imageUrl;

        utils.BaseTextureCache[imageUrl] = baseTexture;

        // if there is an @2x at the end of the url we are going to assume its a highres image
        baseTexture.resolution = utils.getResolutionOfUrl(imageUrl);
    }

    return baseTexture;
};

/**
 * Helper function that creates a base texture from the given canvas element.
 *
 * @static
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {number} See {{#crossLink "PIXI/scaleModes:property"}}scaleModes{{/crossLink}} for possible values
 * @return BaseTexture
 */
BaseTexture.fromCanvas = function (canvas, scaleMode)
{
    if (!canvas._pixiId)
    {
        canvas._pixiId = 'canvas_' + utils.uid();
    }

    var baseTexture = utils.BaseTextureCache[canvas._pixiId];

    if (!baseTexture)
    {
        baseTexture = new BaseTexture(canvas, scaleMode);
        utils.BaseTextureCache[canvas._pixiId] = baseTexture;
    }

    return baseTexture;
};

},{"../const":6,"../utils":46,"eventemitter3":3}],40:[function(require,module,exports){
var BaseTexture = require('./BaseTexture'),
    Texture = require('./Texture'),
    RenderTarget = require('../renderers/webgl/utils/RenderTarget'),
    FilterManager = require('../renderers/webgl/managers/FilterManager'),
    CanvasBuffer = require('../renderers/canvas/utils/CanvasBuffer'),
    math = require('../math'),
    CONST = require('../const'),
    tempMatrix = new math.Matrix();

/**
 * A RenderTexture is a special texture that allows any Pixi display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a RenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A RenderTexture takes a snapshot of any Display Object given to its render method. The position
 * and rotation of the given Display Objects is ignored. For example:
 *
 * ```js
 * var renderTexture = new PIXI.RenderTexture(800, 600);
 * var sprite = PIXI.Sprite.fromImage("spinObj_01.png");
 *
 * sprite.position.x = 800/2;
 * sprite.position.y = 600/2;
 * sprite.anchor.x = 0.5;
 * sprite.anchor.y = 0.5;
 *
 * renderTexture.render(sprite);
 * ```
 *
 * The Sprite in this case will be rendered to a position of 0,0. To render this sprite at its actual
 * position a Container should be used:
 *
 * ```js
 * var doc = new Container();
 *
 * doc.addChild(sprite);
 *
 * renderTexture.render(doc);  // Renders to center of renderTexture
 * ```
 *
 * @class
 * @extends PIXI.Texture
 * @memberof PIXI
 * @param renderer {CanvasRenderer|WebGLRenderer} The renderer used for this RenderTexture
 * @param [width=100] {number} The width of the render texture
 * @param [height=100] {number} The height of the render texture
 * @param [scaleMode] {number} See {@link SCALE_MODES} for possible values
 * @param [resolution=1] {number} The resolution of the texture being generated
 */
function RenderTexture(renderer, width, height, scaleMode, resolution)
{
    if (!renderer)
    {
        throw new Error('Unable to create RenderTexture, you must pass a renderer into the constructor.');
    }

    width = width || 100;
    height = height || 100;
    resolution = resolution || CONST.RESOLUTION;

    /**
     * The base texture object that this texture uses
     *
     * @member {BaseTexture}
     */
    var baseTexture = new BaseTexture();
    baseTexture.width = width;
    baseTexture.height = height;
    baseTexture.resolution = resolution;
    baseTexture.scaleMode = scaleMode || CONST.SCALE_MODES.DEFAULT;
    baseTexture.hasLoaded = true;


    Texture.call(this,
        baseTexture,
        new math.Rectangle(0, 0, width, height)
    );


    /**
     * The with of the render texture
     *
     * @member {number}
     */
    this.width = width;

    /**
     * The height of the render texture
     *
     * @member {number}
     */
    this.height = height;

    /**
     * The Resolution of the texture.
     *
     * @member {number}
     */
    this.resolution = resolution;

    /**
     * The framing rectangle of the render texture
     *
     * @member {Rectangle}
     */
    //this._frame = new math.Rectangle(0, 0, this.width * this.resolution, this.height * this.resolution);

    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     *
     * @member {Rectangle}
     */
    //this.crop = new math.Rectangle(0, 0, this.width * this.resolution, this.height * this.resolution);

    /**
     * Draw/render the given DisplayObject onto the texture.
     *
     * The displayObject and descendents are transformed during this operation.
     * If `updateTransform` is true then the transformations will be restored before the
     * method returns. Otherwise it is up to the calling code to correctly use or reset
     * the transformed display objects.
     *
     * The display object is always rendered with a worldAlpha value of 1.
     *
     * @method
     * @param displayObject {DisplayObject} The display object to render this texture on
     * @param [matrix] {Matrix} Optional matrix to apply to the display object before rendering.
     * @param [clear=false] {boolean} If true the texture will be cleared before the displayObject is drawn
     * @param [updateTransform=true] {boolean} If true the displayObject's worldTransform/worldAlpha and all children
     *  transformations will be restored. Not restoring this information will be a little faster.
     */
    this.render = null;

    /**
     * The renderer this RenderTexture uses. A RenderTexture can only belong to one renderer at the moment if its webGL.
     *
     * @member {CanvasRenderer|WebGLRenderer}
     */
    this.renderer = renderer;

    if (this.renderer.type === CONST.RENDERER_TYPE.WEBGL)
    {
        var gl = this.renderer.gl;

        this.textureBuffer = new RenderTarget(gl, this.width, this.height, baseTexture.scaleMode, this.resolution);//, this.baseTexture.scaleMode);
        this.baseTexture._glTextures[gl.id] =  this.textureBuffer.texture;

        //TODO refactor filter manager.. as really its no longer a manager if we use it here..
        this.filterManager = new FilterManager(this.renderer);
        this.filterManager.onContextChange();
        this.filterManager.resize(width, height);
        this.render = this.renderWebGL;

        // the creation of a filter manager unbinds the buffers..
        this.renderer.currentRenderer.start();
        this.renderer.currentRenderTarget.activate();
    }
    else
    {

        this.render = this.renderCanvas;
        this.textureBuffer = new CanvasBuffer(this.width* this.resolution, this.height* this.resolution);
        this.baseTexture.source = this.textureBuffer.canvas;
    }

    /**
     * @member {boolean}
     */
    this.valid = true;

    this._updateUvs();
}

RenderTexture.prototype = Object.create(Texture.prototype);
RenderTexture.prototype.constructor = RenderTexture;
module.exports = RenderTexture;

/**
 * Resizes the RenderTexture.
 *
 * @param width {number} The width to resize to.
 * @param height {number} The height to resize to.
 * @param updateBase {boolean} Should the baseTexture.width and height values be resized as well?
 */
RenderTexture.prototype.resize = function (width, height, updateBase)
{
    if (width === this.width && height === this.height)
    {
        return;
    }

    this.valid = (width > 0 && height > 0);

    this.width = this._frame.width = this.crop.width = width;
    this.height =  this._frame.height = this.crop.height = height;

    if (updateBase)
    {
        this.baseTexture.width = this.width;
        this.baseTexture.height = this.height;
    }

    if (!this.valid)
    {
        return;
    }

    this.textureBuffer.resize(this.width, this.height);

    if(this.filterManager)
    {
        this.filterManager.resize(this.width, this.height);
    }
};

/**
 * Clears the RenderTexture.
 *
 */
RenderTexture.prototype.clear = function ()
{
    if (!this.valid)
    {
        return;
    }

    if (this.renderer.type === CONST.RENDERER_TYPE.WEBGL)
    {
        this.renderer.gl.bindFramebuffer(this.renderer.gl.FRAMEBUFFER, this.textureBuffer.frameBuffer);
    }

    this.textureBuffer.clear();
};

/**
 * Internal method assigned to the `render` property if using a CanvasRenderer.
 *
 * @private
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param [matrix] {Matrix} Optional matrix to apply to the display object before rendering.
 * @param [clear=false] {boolean} If true the texture will be cleared before the displayObject is drawn
 * @param [updateTransform=true] {boolean} If true the displayObject's worldTransform/worldAlpha and all children
 *  transformations will be restored. Not restoring this information will be a little faster.
 */
RenderTexture.prototype.renderWebGL = function (displayObject, matrix, clear, updateTransform)
{
    if (!this.valid)
    {
        return;
    }


    updateTransform = (updateTransform !== undefined) ? updateTransform : true;//!updateTransform;

    this.textureBuffer.transform = matrix;

    //TODO not a fan that this is here... it will move!
    this.textureBuffer.activate();
    
    // setWorld Alpha to ensure that the object is renderer at full opacity
    displayObject.worldAlpha = 1;

    if (updateTransform)
    {

        // reset the matrix of the displatyObject..
        displayObject.worldTransform.identity();

        displayObject.currentBounds = null;

        // Time to update all the children of the displayObject with the new matrix..
        var children = displayObject.children;
        var i, j;

        for (i = 0, j = children.length; i < j; ++i)
        {
            children[i].updateTransform();
        }
    }

    //TODO rename textureBuffer to renderTarget..
    var temp =  this.renderer.filterManager;

    this.renderer.filterManager = this.filterManager;
    this.renderer.renderDisplayObject(displayObject, this.textureBuffer, clear);

    this.renderer.filterManager = temp;
};


/**
 * Internal method assigned to the `render` property if using a CanvasRenderer.
 *
 * @private
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param [matrix] {Matrix} Optional matrix to apply to the display object before rendering.
 * @param [clear] {boolean} If true the texture will be cleared before the displayObject is drawn
 */
RenderTexture.prototype.renderCanvas = function (displayObject, matrix, clear, updateTransform)
{
    if (!this.valid)
    {
        return;
    }

    updateTransform = !!updateTransform;
    var cachedWt = displayObject.worldTransform;

    var wt = tempMatrix;

    wt.identity();

    if (matrix)
    {
        wt.append(matrix);
    }

    displayObject.worldTransform = wt;

    // setWorld Alpha to ensure that the object is renderer at full opacity
    displayObject.worldAlpha = 1;

    // Time to update all the children of the displayObject with the new matrix..
    var children = displayObject.children;
    var i, j;

    for (i = 0, j = children.length; i < j; ++i)
    {
        children[i].updateTransform();
    }

    if (clear)
    {
        this.textureBuffer.clear();
    }

    displayObject.worldTransform = cachedWt;

//    this.textureBuffer.
    var context = this.textureBuffer.context;

    var realResolution = this.renderer.resolution;

    this.renderer.resolution = this.resolution;

    this.renderer.renderDisplayObject(displayObject, context);

    this.renderer.resolution = realResolution;
 //   context.setTransform(1, 0, 0, 1, 0, 0);
   // context.fillStyle ="#FF0000"
//    context.fillRect(0, 0, 800, 600);

};

/**
 * Destroys this texture
 *
 * @param destroyBase {boolean} Whether to destroy the base texture as well
 */
RenderTexture.prototype.destroy = function ()
{
    Texture.prototype.destroy.call(this, true);

    this.textureBuffer.destroy();

    // destroy the filtermanager..
    if(this.filterManager)
    {
        this.filterManager.destroy();
    }

    this.renderer = null;
};

/**
 * Will return a HTML Image of the texture
 *
 * @return {Image}
 */
RenderTexture.prototype.getImage = function ()
{
    var image = new Image();
    image.src = this.getBase64();
    return image;
};

/**
 * Will return a a base64 encoded string of this texture. It works by calling RenderTexture.getCanvas and then running toDataURL on that.
 *
 * @return {string} A base64 encoded string of the texture.
 */
RenderTexture.prototype.getBase64 = function ()
{
    return this.getCanvas().toDataURL();
};

/**
 * Creates a Canvas element, renders this RenderTexture to it and then returns it.
 *
 * @return {HTMLCanvasElement} A Canvas element with the texture rendered on.
 */
RenderTexture.prototype.getCanvas = function ()
{
    if (this.renderer.type === CONST.RENDERER_TYPE.WEBGL)
    {
        var gl = this.renderer.gl;
        var width = this.textureBuffer.size.width;
        var height = this.textureBuffer.size.height;

        var webGLPixels = new Uint8Array(4 * width * height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureBuffer.frameBuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, webGLPixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        var tempCanvas = new CanvasBuffer(width, height);
        var canvasData = tempCanvas.context.getImageData(0, 0, width, height);
        canvasData.data.set(webGLPixels);

        tempCanvas.context.putImageData(canvasData, 0, 0);

        return tempCanvas.canvas;
    }
    else
    {
        return this.textureBuffer.canvas;
    }
};

/**
 * Will return a one-dimensional array containing the pixel data of the entire texture in RGBA order, with integer values between 0 and 255 (included).
 *
 * @return {Uint8ClampedArray}
 */
RenderTexture.prototype.getPixels = function ()
{
    var width, height;

    if (this.renderer.type === CONST.RENDERER_TYPE.WEBGL)
    {
        var gl = this.renderer.gl;
        width = this.textureBuffer.size.width;
        height = this.textureBuffer.size.height;

        var webGLPixels = new Uint8Array(4 * width * height);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureBuffer.frameBuffer);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, webGLPixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return webGLPixels;
    }
    else
    {
        width = this.textureBuffer.canvas.width;
        height = this.textureBuffer.canvas.height;

        return this.textureBuffer.canvas.getContext('2d').getImageData(0, 0, width, height).data;
    }
};

/**
 * Will return a one-dimensional array containing the pixel data of a pixel within the texture in RGBA order, with integer values between 0 and 255 (included).
 *
 * @param x {number} The x coordinate of the pixel to retrieve.
 * @param y {number} The y coordinate of the pixel to retrieve.
 * @return {Uint8ClampedArray}
 */
RenderTexture.prototype.getPixel = function (x, y)
{
    if (this.renderer.type === CONST.RENDERER_TYPE.WEBGL)
    {
        var gl = this.renderer.gl;

        var webGLPixels = new Uint8Array(4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureBuffer.frameBuffer);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, webGLPixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return webGLPixels;
    }
    else
    {
        return this.textureBuffer.canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    }
};

},{"../const":6,"../math":12,"../renderers/canvas/utils/CanvasBuffer":15,"../renderers/webgl/managers/FilterManager":24,"../renderers/webgl/utils/RenderTarget":35,"./BaseTexture":39,"./Texture":41}],41:[function(require,module,exports){
var BaseTexture = require('./BaseTexture'),
    VideoBaseTexture = require('./VideoBaseTexture'),
    TextureUvs = require('./TextureUvs'),
    EventEmitter = require('eventemitter3'),
    math = require('../math'),
    utils = require('../utils');

/**
 * A texture stores the information that represents an image or part of an image. It cannot be added
 * to the display list directly. Instead use it as the texture for a Sprite. If no frame is provided then the whole image is used.
 *
 * You can directly create a texture from an image and then reuse it multiple times like this :
 *
 * ```js
 * var texture = PIXI.Texture.fromImage('assets/image.png');
 * var sprite1 = new PIXI.Sprite(texture);
 * var sprite2 = new PIXI.Sprite(texture);
 * ```
 *
 * @class
 * @memberof PIXI
 * @param baseTexture {BaseTexture} The base texture source to create the texture from
 * @param [frame] {Rectangle} The rectangle frame of the texture to show
 * @param [crop] {Rectangle} The area of original texture
 * @param [trim] {Rectangle} Trimmed texture rectangle
 * @param [rotate] {boolean} indicates whether the texture should be rotated by 90 degrees ( used by texture packer )
 */
function Texture(baseTexture, frame, crop, trim, rotate)
{
    EventEmitter.call(this);

    /**
     * Does this Texture have any frame data assigned to it?
     *
     * @member {boolean}
     */
    this.noFrame = false;

    if (!frame)
    {
        this.noFrame = true;
        frame = new math.Rectangle(0, 0, 1, 1);
    }

    if (baseTexture instanceof Texture)
    {
        baseTexture = baseTexture.baseTexture;
    }

  //  console.log(frame);

    /**
     * The base texture that this texture uses.
     *
     * @member {BaseTexture}
     */
    this.baseTexture = baseTexture;

    /**
     * The frame specifies the region of the base texture that this texture uses
     *
     * @member {Rectangle}
     * @private
     */
    this._frame = frame;

    /**
     * The texture trim data.
     *
     * @member {Rectangle}
     */
    this.trim = trim;

    /**
     * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
     *
     * @member {boolean}
     */
    this.valid = false;

    /**
     * This will let a renderer know that a texture has been updated (used mainly for webGL uv updates)
     *
     * @member {boolean}
     */
    this.requiresUpdate = false;

    /**
     * The WebGL UV data cache.
     *
     * @member {TextureUvs}
     * @private
     */
    this._uvs = null;

    /**
     * The width of the Texture in pixels.
     *
     * @member {number}
     */
    this.width = 0;

    /**
     * The height of the Texture in pixels.
     *
     * @member {number}
     */
    this.height = 0;

    /**
     * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
     * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
     *
     * @member {Rectangle}
     */
    this.crop = crop || frame;//new math.Rectangle(0, 0, 1, 1);

    /**
     * Indicates whether the texture should be rotated by 90 degrees
     *
     * @private
     * @member {boolean}
     */
    this.rotate = !!rotate;

    if (baseTexture.hasLoaded)
    {
        if (this.noFrame)
        {
            frame = new math.Rectangle(0, 0, baseTexture.width, baseTexture.height);

            // if there is no frame we should monitor for any base texture changes..
            baseTexture.on('update', this.onBaseTextureUpdated, this);
        }
        this.frame = frame;
    }
    else
    {
        baseTexture.once('loaded', this.onBaseTextureLoaded, this);
    }

    /**
     * Fired when the texture is updated. This happens if the frame or the baseTexture is updated.
     *
     * @event update
     * @memberof PIXI.Texture#
     * @protected
     */
}

Texture.prototype = Object.create(EventEmitter.prototype);
Texture.prototype.constructor = Texture;
module.exports = Texture;

Object.defineProperties(Texture.prototype, {
    frame: {
        get: function ()
        {
            return this._frame;
        },
        set: function (frame)
        {
            this._frame = frame;

            this.noFrame = false;

            this.width = frame.width;
            this.height = frame.height;



            if (!this.trim && !this.rotate && (frame.x + frame.width > this.baseTexture.width || frame.y + frame.height > this.baseTexture.height))
            {
                throw new Error('Texture Error: frame does not fit inside the base Texture dimensions ' + this);
            }

            //this.valid = frame && frame.width && frame.height && this.baseTexture.source && this.baseTexture.hasLoaded;
            this.valid = frame && frame.width && frame.height && this.baseTexture.hasLoaded;

            if (this.trim)
            {

                this.width = this.trim.width;
                this.height = this.trim.height;
                this._frame.width = this.trim.width;
                this._frame.height = this.trim.height;
            }
            else
            {
                this.crop = frame;
            }

            if (this.valid)
            {
                this._updateUvs();
            }
        }
    }
});

/**
 * Updates this texture on the gpu.
 *
 */
Texture.prototype.update = function ()
{
    this.baseTexture.update();
};

/**
 * Called when the base texture is loaded
 *
 * @private
 */
Texture.prototype.onBaseTextureLoaded = function (baseTexture)
{
    // TODO this code looks confusing.. boo to abusing getters and setterss!
    if (this.noFrame)
    {
        this.frame = new math.Rectangle(0, 0, baseTexture.width, baseTexture.height);
    }
    else
    {
        this.frame = this._frame;
    }

    this.emit('update', this);
};

Texture.prototype.onBaseTextureUpdated = function (baseTexture)
{
    this._frame.width = baseTexture.width;
    this._frame.height = baseTexture.height;

    this.emit('update', this);
};

/**
 * Destroys this texture
 *
 * @param destroyBase {boolean} Whether to destroy the base texture as well
 */
Texture.prototype.destroy = function (destroyBase)
{
    if (this.baseTexture)
    {
        if (destroyBase)
        {
            this.baseTexture.destroy();
        }

        this.baseTexture.off('update', this.onBaseTextureUpdated, this);
        this.baseTexture.off('loaded', this.onBaseTextureLoaded, this);

        this.baseTexture = null;
    }

    this._frame = null;
    this._uvs = null;
    this.trim = null;
    this.crop = null;

    this.valid = false;
};

Texture.prototype.clone = function ()
{
    return new Texture(this.baseTexture, this.frame, this.crop, this.trim, this.rotate);
};

/**
 * Updates the internal WebGL UV cache.
 *
 * @private
 */
Texture.prototype._updateUvs = function ()
{
    if (!this._uvs)
    {
        this._uvs = new TextureUvs();
    }

    this._uvs.set(this.crop, this.baseTexture, this.rotate);
};

/**
 * Helper function that creates a Texture object from the given image url.
 * If the image is not in the texture cache it will be  created and loaded.
 *
 * @static
 * @param imageUrl {string} The image url of the texture
 * @param crossorigin {boolean} Whether requests should be treated as crossorigin
 * @param scaleMode {number} See {{#crossLink "PIXI/scaleModes:property"}}scaleModes{{/crossLink}} for possible values
 * @return {Texture} The newly created texture
 */
Texture.fromImage = function (imageUrl, crossorigin, scaleMode)
{
    var texture = utils.TextureCache[imageUrl];

    if (!texture)
    {
        texture = new Texture(BaseTexture.fromImage(imageUrl, crossorigin, scaleMode));
        utils.TextureCache[imageUrl] = texture;
    }

    return texture;
};

/**
 * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
 * The frame ids are created when a Texture packer file has been loaded
 *
 * @static
 * @param frameId {String} The frame Id of the texture in the cache
 * @return {Texture} The newly created texture
 */
Texture.fromFrame = function (frameId)
{
    var texture = utils.TextureCache[frameId];

    if (!texture)
    {
        throw new Error('The frameId "' + frameId + '" does not exist in the texture cache');
    }

    return texture;
};

/**
 * Helper function that creates a new Texture based on the given canvas element.
 *
 * @static
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {number} See {{#crossLink "PIXI/scaleModes:property"}}scaleModes{{/crossLink}} for possible values
 * @return {Texture}
 */
Texture.fromCanvas = function (canvas, scaleMode)
{
    return new Texture(BaseTexture.fromCanvas(canvas, scaleMode));
};

/**
 * Helper function that creates a new Texture based on the given video element.
 *
 * @static
 * @param video {HTMLVideoElement}
 * @param scaleMode {number} See {{#crossLink "PIXI/scaleModes:property"}}scaleModes{{/crossLink}} for possible values
 * @return {Texture} A Texture
 */
Texture.fromVideo = function (video, scaleMode)
{
    if (typeof video === 'string')
    {
        return Texture.fromVideoUrl(video, scaleMode);
    }
    else
    {
        return new Texture(VideoBaseTexture.fromVideo(video, scaleMode));
    }
};

/**
 * Helper function that creates a new Texture based on the video url.
 *
 * @static
 * @param videoUrl {string}
 * @param scaleMode {number} See {{@link SCALE_MODES}} for possible values
 * @return {Texture} A Texture
 */
Texture.fromVideoUrl = function (videoUrl, scaleMode)
{
    return new Texture(VideoBaseTexture.fromUrl(videoUrl, scaleMode));
};

/**
 * Adds a texture to the global utils.TextureCache. This cache is shared across the whole PIXI object.
 *
 * @static
 * @param texture {Texture} The Texture to add to the cache.
 * @param id {string} The id that the texture will be stored against.
 */
Texture.addTextureToCache = function (texture, id)
{
    utils.TextureCache[id] = texture;
};

/**
 * Remove a texture from the global utils.TextureCache.
 *
 * @static
 * @param id {string} The id of the texture to be removed
 * @return {Texture} The texture that was removed
 */
Texture.removeTextureFromCache = function (id)
{
    var texture = utils.TextureCache[id];

    delete utils.TextureCache[id];
    delete utils.BaseTextureCache[id];

    return texture;
};

Texture.EMPTY = new Texture(new BaseTexture());

},{"../math":12,"../utils":46,"./BaseTexture":39,"./TextureUvs":42,"./VideoBaseTexture":43,"eventemitter3":3}],42:[function(require,module,exports){

/**
 * A standard object to store the Uvs of a texture
 *
 * @class
 * @private
 */
function TextureUvs()
{
    this.x0 = 0;
    this.y0 = 0;

    this.x1 = 1;
    this.y1 = 0;

    this.x2 = 1;
    this.y2 = 1;

    this.x3 = 0;
    this.y3 = 1;
}

module.exports = TextureUvs;

/**
 * Sets the texture Uvs based on the given frame information
 * @param frame {Rectangle}
 * @param baseFrame {Rectangle}
 * @param rotate {boolean} Whether or not the frame is rotated
 * @private
 */
TextureUvs.prototype.set = function (frame, baseFrame, rotate)
{
    var tw = baseFrame.width;
    var th = baseFrame.height;

    if(rotate)
    {
        this.x0 = (frame.x + frame.height) / tw;
        this.y0 = frame.y / th;

        this.x1 = (frame.x + frame.height) / tw;
        this.y1 = (frame.y + frame.width) / th;

        this.x2 = frame.x / tw;
        this.y2 = (frame.y + frame.width) / th;

        this.x3 = frame.x / tw;
        this.y3 = frame.y / th;
    }
    else
    {

        this.x0 = frame.x / tw;
        this.y0 = frame.y / th;

        this.x1 = (frame.x + frame.width) / tw;
        this.y1 = frame.y / th;

        this.x2 = (frame.x + frame.width) / tw;
        this.y2 = (frame.y + frame.height) / th;

        this.x3 = frame.x / tw;
        this.y3 = (frame.y + frame.height) / th;
    }
};

},{}],43:[function(require,module,exports){
var BaseTexture = require('./BaseTexture'),
    utils = require('../utils');

/**
 * A texture of a [playing] Video.
 *
 * Video base textures mimic Pixi BaseTexture.from.... method in their creation process.
 *
 * This can be used in several ways, such as:
 *
 * ```js
 * var texture = PIXI.VideoBaseTexture.fromUrl('http://mydomain.com/video.mp4');
 *
 * var texture = PIXI.VideoBaseTexture.fromUrl({ src: 'http://mydomain.com/video.mp4', mime: 'video/mp4' });
 *
 * var texture = PIXI.VideoBaseTexture.fromUrls(['/video.webm', '/video.mp4']);
 *
 * var texture = PIXI.VideoBaseTexture.fromUrls([
 *     { src: '/video.webm', mime: 'video/webm' },
 *     { src: '/video.mp4', mime: 'video/mp4' }
 * ]);
 * ```
 *
 * See the ["deus" demo](http://www.goodboydigital.com/pixijs/examples/deus/).
 *
 * @class
 * @extends PIXI.BaseTexture
 * @memberof PIXI
 * @param source {HTMLVideoElement}
 * @param [scaleMode] {number} See {@link SCALE_MODES} for possible values
 */
function VideoBaseTexture(source, scaleMode)
{
    if (!source)
    {
        throw new Error('No video source element specified.');
    }

    // hook in here to check if video is already available.
    // BaseTexture looks for a source.complete boolean, plus width & height.

    if ((source.readyState === source.HAVE_ENOUGH_DATA || source.readyState === source.HAVE_FUTURE_DATA) && source.width && source.height)
    {
        source.complete = true;
    }

    BaseTexture.call(this, source, scaleMode);

    /**
     * Should the base texture automatically update itself, set to true by default
     *
     * @member {boolean}
     * @default true
     */
    this.autoUpdate = false;

    this._onUpdate = this._onUpdate.bind(this);
    this._onCanPlay = this._onCanPlay.bind(this);

    if (!source.complete)
    {
        source.addEventListener('canplay', this._onCanPlay);
        source.addEventListener('canplaythrough', this._onCanPlay);

        // started playing..
        source.addEventListener('play', this._onPlayStart.bind(this));
        source.addEventListener('pause', this._onPlayStop.bind(this));
    }

    this.__loaded = false;
}

VideoBaseTexture.prototype = Object.create(BaseTexture.prototype);
VideoBaseTexture.prototype.constructor = VideoBaseTexture;
module.exports = VideoBaseTexture;

/**
 * The internal update loop of the video base texture, only runs when autoUpdate is set to true
 * @private
 */
VideoBaseTexture.prototype._onUpdate = function ()
{
    if (this.autoUpdate)
    {
        window.requestAnimationFrame(this._onUpdate);
        this.update();
    }
};

/**
 * Runs the update loop when the video is ready to play
 * @private
 */
VideoBaseTexture.prototype._onPlayStart = function ()
{
    if (!this.autoUpdate)
    {
        window.requestAnimationFrame(this._onUpdate);
        this.autoUpdate = true;
    }
};

/**
 * Fired when a pause event is triggered, stops the update loop
 * @private
 */
VideoBaseTexture.prototype._onPlayStop = function ()
{
    this.autoUpdate = false;
};

/**
 * Fired when the video is loaded and ready to play
 * @private
 */
VideoBaseTexture.prototype._onCanPlay = function ()
{
    this.hasLoaded = true;

    if (this.source)
    {
        this.source.removeEventListener('canplay', this._onCanPlay);
        this.source.removeEventListener('canplaythrough', this._onCanPlay);

        this.width = this.source.videoWidth;
        this.height = this.source.videoHeight;

        this.source.play();

        // prevent multiple loaded dispatches..
        if (!this.__loaded)
        {
            this.__loaded = true;
            this.emit('loaded', this);
        }
    }
};

/**
 * Destroys this texture
 *
 */
VideoBaseTexture.prototype.destroy = function ()
{
    if (this.source && this.source._pixiId)
    {
        delete utils.BaseTextureCache[ this.source._pixiId ];
        delete this.source._pixiId;
    }

    BaseTexture.prototype.destroy.call(this);
};

/**
 * Mimic Pixi BaseTexture.from.... method.
 *
 * @static
 * @param video {HTMLVideoElement}
 * @param scaleMode {number} See {@link SCALE_MODES} for possible values
 * @return {VideoBaseTexture}
 */
VideoBaseTexture.fromVideo = function (video, scaleMode)
{
    if (!video._pixiId)
    {
        video._pixiId = 'video_' + utils.uid();
    }

    var baseTexture = utils.BaseTextureCache[video._pixiId];

    if (!baseTexture)
    {
        baseTexture = new VideoBaseTexture(video, scaleMode);
        utils.BaseTextureCache[ video._pixiId ] = baseTexture;
    }

    return baseTexture;
};

/**
 * Helper function that creates a new BaseTexture based on the given video element.
 * This BaseTexture can then be used to create a texture
 *
 * @static
 * @param videoSrc {string|object|string[]|object[]} The URL(s) for the video.
 * @param [videoSrc.src] {string} One of the source urls for the video
 * @param [videoSrc.mime] {string} The mimetype of the video (e.g. 'video/mp4'). If not specified
 *  the url's extension will be used as the second part of the mime type.
 * @param scaleMode {number} See {@link SCALE_MODES} for possible values
 * @return {VideoBaseTexture}
 */
VideoBaseTexture.fromUrl = function (videoSrc, scaleMode)
{
    var video = document.createElement('video');

    // array of objects or strings
    if (Array.isArray(videoSrc))
    {
        for (var i = 0; i < videoSrc.length; ++i)
        {
            video.appendChild(createSource(videoSrc.src || videoSrc, videoSrc.mime));
        }
    }
    // single object or string
    else
    {
        video.appendChild(createSource(videoSrc.src || videoSrc, videoSrc.mime));
    }

    video.load();
    video.play();

    return VideoBaseTexture.fromVideo(video, scaleMode);
};

VideoBaseTexture.fromUrls = VideoBaseTexture.fromUrl;

function createSource(path, type)
{
    if (!type)
    {
        type = 'video/' + path.substr(path.lastIndexOf('.') + 1);
    }

    var source = document.createElement('source');

    source.src = path;
    source.type = type;

    return source;
}

},{"../utils":46,"./BaseTexture":39}],44:[function(require,module,exports){
var CONST = require('../const'),
    EventEmitter = require('eventemitter3'),
    // Internal event used by composed emitter
    TICK = 'tick';

/**
 * A Ticker class that runs an update loop that other objects listen to.
 * This class is composed around an EventEmitter object to add listeners
 * meant for execution on the next requested animation frame.
 * Animation frames are requested only when necessary,
 * e.g. When the ticker is started and the emitter has listeners.
 *
 * @class
 * @memberof PIXI.ticker
 */
function Ticker()
{
    var _this = this;
    /**
     * Internal tick method bound to ticker instance.
     * This is because in early 2015, Function.bind
     * is still 60% slower in high performance scenarios.
     * Also separating frame requests from update method
     * so listeners may be called at any time and with
     * any animation API, just invoke ticker.update(time).
     *
     * @private
     */
    this._tick = function _tick(time) {

        _this._requestId = null;

        if (_this.started)
        {
            // Invoke listeners now
            _this.update(time);
            // Listener side effects may have modified ticker state.
            if (_this.started && _this._requestId === null && _this._emitter.listeners(TICK, true))
            {
                _this._requestId = requestAnimationFrame(_this._tick);
            }
        }
    };
    /**
     * Internal emitter used to fire 'tick' event
     * @private
     */
    this._emitter = new EventEmitter();
    /**
     * Internal current frame request ID
     * @private
     */
    this._requestId = null;
    /**
     * Internal value managed by minFPS property setter and getter.
     * This is the maximum allowed milliseconds between updates.
     * @private
     */
    this._maxElapsedMS = 100;

    /**
     * Whether or not this ticker should invoke the method
     * {@link PIXI.ticker.Ticker#start} automatically
     * when a listener is added.
     *
     * @member {boolean}
     * @default false
     */
    this.autoStart = false;

    /**
     * Scalar time value from last frame to this frame.
     * This value is capped by setting {@link PIXI.ticker.Ticker#minFPS}
     * and is scaled with {@link PIXI.ticker.Ticker#speed}.
     * **Note:** The cap may be exceeded by scaling.
     *
     * @member {number}
     * @default 1
     */
    this.deltaTime = 1;

    /**
     * Time elapsed in milliseconds from last frame to this frame.
     * Opposed to what the scalar {@link PIXI.ticker.Ticker#deltaTime}
     * is based, this value is neither capped nor scaled.
     * If the platform supports DOMHighResTimeStamp,
     * this value will have a precision of 1 µs.
     *
     * @member {DOMHighResTimeStamp|number}
     * @default 1 / TARGET_FPMS
     */
    this.elapsedMS = 1 / CONST.TARGET_FPMS; // default to target frame time

    /**
     * The last time {@link PIXI.ticker.Ticker#update} was invoked.
     * This value is also reset internally outside of invoking
     * update, but only when a new animation frame is requested.
     * If the platform supports DOMHighResTimeStamp,
     * this value will have a precision of 1 µs.
     *
     * @member {DOMHighResTimeStamp|number}
     * @default 0
     */
    this.lastTime = 0;

    /**
     * Factor of current {@link PIXI.ticker.Ticker#deltaTime}.
     * @example
     *     // Scales ticker.deltaTime to what would be
     *     // the equivalent of approximately 120 FPS
     *     ticker.speed = 2;
     *
     * @member {number}
     * @default 1
     */
    this.speed = 1;

    /**
     * Whether or not this ticker has been started.
     * `true` if {@link PIXI.ticker.Ticker#start} has been called.
     * `false` if {@link PIXI.ticker.Ticker#stop} has been called.
     * While `false`, this value may change to `true` in the
     * event of {@link PIXI.ticker.Ticker#autoStart} being `true`
     * and a listener is added.
     *
     * @member {boolean}
     * @default false
     */
    this.started = false;
}

Object.defineProperties(Ticker.prototype, {
    /**
     * The frames per second at which this ticker is running.
     * The default is approximately 60 in most modern browsers.
     * **Note:** This does not factor in the value of
     * {@link PIXI.ticker.Ticker#speed}, which is specific
     * to scaling {@link PIXI.ticker.Ticker#deltaTime}.
     *
     * @member
     * @memberof PIXI.ticker.Ticker#
     * @readonly
     */
    FPS: {
        get: function()
        {
            return 1000 / this.elapsedMS;
        }
    },

    /**
     * Manages the maximum amount of milliseconds allowed to
     * elapse between invoking {@link PIXI.ticker.Ticker#update}.
     * This value is used to cap {@link PIXI.ticker.Ticker#deltaTime},
     * but does not effect the measured value of {@link PIXI.ticker.Ticker#FPS}.
     * When setting this property it is clamped to a value between
     * `0` and `PIXI.TARGET_FPMS * 1000`.
     *
     * @member
     * @memberof PIXI.ticker.Ticker#
     * @default 10
     */
    minFPS: {
        get: function()
        {
            return 1000 / this._maxElapsedMS;
        },
        set: function(fps)
        {
            // Clamp: 0 to TARGET_FPMS
            var minFPMS = Math.min(Math.max(0, fps) / 1000, CONST.TARGET_FPMS);
            this._maxElapsedMS = 1 / minFPMS;
        }
    }
});

/**
 * Conditionally requests a new animation frame.
 * If a frame has not already been requested, and if the internal
 * emitter has listeners, a new frame is requested.
 *
 * @private
 */
Ticker.prototype._requestIfNeeded = function _requestIfNeeded()
{
    if (this._requestId === null && this._emitter.listeners(TICK, true))
    {
        // ensure callbacks get correct delta
        this.lastTime = performance.now();
        this._requestId = requestAnimationFrame(this._tick);
    }
};

/**
 * Conditionally cancels a pending animation frame.
 *
 * @private
 */
Ticker.prototype._cancelIfNeeded = function _cancelIfNeeded()
{
    if (this._requestId !== null)
    {
        cancelAnimationFrame(this._requestId);
        this._requestId = null;
    }
};

/**
 * Conditionally requests a new animation frame.
 * If the ticker has been started it checks if a frame has not already
 * been requested, and if the internal emitter has listeners. If these
 * conditions are met, a new frame is requested. If the ticker has not
 * been started, but autoStart is `true`, then the ticker starts now,
 * and continues with the previous conditions to request a new frame.
 *
 * @private
 */
Ticker.prototype._startIfPossible = function _startIfPossible()
{
    if (this.started)
    {
        this._requestIfNeeded();
    }
    else if (this.autoStart)
    {
        this.start();
    }
};

/**
 * Calls {@link module:eventemitter3.EventEmitter#on} internally for the
 * internal 'tick' event. It checks if the emitter has listeners,
 * and if so it requests a new animation frame at this point.
 *
 * @param fn {Function} The listener function to be added for updates
 * @param [context] {Function} The listener context
 * @returns {PIXI.ticker.Ticker} this
 */
Ticker.prototype.add = function add(fn, context)
{
    this._emitter.on(TICK, fn, context);

    this._startIfPossible();

    return this;
};

/**
 * Calls {@link module:eventemitter3.EventEmitter#once} internally for the
 * internal 'tick' event. It checks if the emitter has listeners,
 * and if so it requests a new animation frame at this point.
 *
 * @param fn {Function} The listener function to be added for one update
 * @param [context] {Function} The listener context
 * @returns {PIXI.ticker.Ticker} this
 */
Ticker.prototype.addOnce = function addOnce(fn, context)
{
    this._emitter.once(TICK, fn, context);

    this._startIfPossible();

    return this;
};

/**
 * Calls {@link module:eventemitter3.EventEmitter#off} internally for 'tick' event.
 * It checks if the emitter has listeners for 'tick' event.
 * If it does, then it cancels the animation frame.
 *
 * @param [fn] {Function} The listener function to be removed
 * @param [context] {Function} The listener context to be removed
 * @returns {PIXI.ticker.Ticker} this
 */
Ticker.prototype.remove = function remove(fn, context)
{
    this._emitter.off(TICK, fn, context);

    if (!this._emitter.listeners(TICK, true))
    {
        this._cancelIfNeeded();
    }

    return this;
};

/**
 * Starts the ticker. If the ticker has listeners
 * a new animation frame is requested at this point.
 */
Ticker.prototype.start = function start()
{
    if (!this.started)
    {
        this.started = true;
        this._requestIfNeeded();
    }
};

/**
 * Stops the ticker. If the ticker has requested
 * an animation frame it is canceled at this point.
 */
Ticker.prototype.stop = function stop()
{
    if (this.started)
    {
        this.started = false;
        this._cancelIfNeeded();
    }
};

/**
 * Triggers an update. An update entails setting the
 * current {@link PIXI.ticker.Ticker#elapsedMS},
 * the current {@link PIXI.ticker.Ticker#deltaTime},
 * invoking all listeners with current deltaTime,
 * and then finally setting {@link PIXI.ticker.Ticker#lastTime}
 * with the value of currentTime that was provided.
 * This method will be called automatically by animation
 * frame callbacks if the ticker instance has been started
 * and listeners are added.
 *
 * @param [currentTime=performance.now()] {DOMHighResTimeStamp|number} the current time of execution
 */
Ticker.prototype.update = function update(currentTime)
{
    var elapsedMS;

    // Allow calling update directly with default currentTime.
    currentTime = currentTime || performance.now();
    // Save uncapped elapsedMS for measurement
    elapsedMS = this.elapsedMS = currentTime - this.lastTime;

    // cap the milliseconds elapsed used for deltaTime
    if (elapsedMS > this._maxElapsedMS)
    {
        elapsedMS = this._maxElapsedMS;
    }

    this.deltaTime = elapsedMS * CONST.TARGET_FPMS * this.speed;

    // Invoke listeners added to internal emitter
    this._emitter.emit(TICK, this.deltaTime);

    this.lastTime = currentTime;
};

module.exports = Ticker;

},{"../const":6,"eventemitter3":3}],45:[function(require,module,exports){
/**
 * @file        Main export of the PIXI extras library
 * @author      Mat Groves <mat@goodboydigital.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */
var Ticker = require('./Ticker');

/**
 * The shared ticker instance used by {@link PIXI.extras.MovieClip}.
 * and by {@link PIXI.interaction.InteractionManager}.
 * The property {@link PIXI.ticker.Ticker#autoStart} is set to `true`
 * for this instance. Please follow the examples for usage, including
 * how to opt-out of auto-starting the shared ticker.
 *
 * @example
 *     var ticker = PIXI.ticker.shared;
 *     // Set this to prevent starting this ticker when listeners are added.
 *     // By default this is true only for the PIXI.ticker.shared instance.
 *     ticker.autoStart = false;
 *     // FYI, call this to ensure the ticker is stopped. It should be stopped
 *     // if you have not attempted to render anything yet.
 *     ticker.stop();
 *     // Call this when you are ready for a running shared ticker.
 *     ticker.start();
 *
 * @example
 *     // You may use the shared ticker to render...
 *     var renderer = PIXI.autoDetectRenderer(800, 600);
 *     var stage = new PIXI.Container();
 *     var interactionManager = PIXI.interaction.InteractionManager(renderer);
 *     document.body.appendChild(renderer.view);
 *     ticker.add(function (time) {
 *         renderer.render(stage);
 *     });
 *
 * @example
 *     // Or you can just update it manually.
 *     ticker.autoStart = false;
 *     ticker.stop();
 *     function animate(time) {
 *         ticker.update(time);
 *         renderer.render(stage);
 *         requestAnimationFrame(animate);
 *     }
 *     animate(performance.now());
 *
 * @type {PIXI.ticker.Ticker}
 * @memberof PIXI.ticker
 */
var shared = new Ticker();
shared.autoStart = true;

/**
 * @namespace PIXI.ticker
 */
module.exports = {
    shared: shared,
    Ticker: Ticker
};

},{"./Ticker":44}],46:[function(require,module,exports){
var CONST = require('../const');

/**
 * @namespace PIXI.utils
 */
var utils = module.exports = {
    _uid: 0,
    _saidHello: false,

    pluginTarget:   require('./pluginTarget'),
    async:          require('async'),

    /**
     * Gets the next unique identifier
     *
     * @return {number} The next unique identifier to use.
     */
    uid: function ()
    {
        return ++utils._uid;
    },

    /**
     * Converts a hex color number to an [R, G, B] array
     *
     * @param hex {number}
     * @return {number[]} An array representing the [R, G, B] of the color.
     */
    hex2rgb: function (hex, out)
    {
        out = out || [];

        out[0] = (hex >> 16 & 0xFF) / 255;
        out[1] = (hex >> 8 & 0xFF) / 255;
        out[2] = (hex & 0xFF) / 255;

        return out;
    },

    /**
     * Converts a hex color number to a string.
     *
     * @param hex {number}
     * @return {string} The string color.
     */
    hex2string: function (hex)
    {
        hex = hex.toString(16);
        hex = '000000'.substr(0, 6 - hex.length) + hex;

        return '#' + hex;
    },

    /**
     * Converts a color as an [R, G, B] array to a hex number
     *
     * @param rgb {number[]}
     * @return {number} The color number
     */
    rgb2hex: function (rgb)
    {
        return ((rgb[0]*255 << 16) + (rgb[1]*255 << 8) + rgb[2]*255);
    },

    /**
     * Checks whether the Canvas BlendModes are supported by the current browser
     *
     * @return {boolean} whether they are supported
     */
    canUseNewCanvasBlendModes: function ()
    {
        if (typeof document === 'undefined')
        {
            return false;
        }

        var pngHead = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABAQMAAADD8p2OAAAAA1BMVEX/';
        var pngEnd = 'AAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==';

        var magenta = new Image();
        magenta.src = pngHead + 'AP804Oa6' + pngEnd;

        var yellow = new Image();
        yellow.src = pngHead + '/wCKxvRF' + pngEnd;

        var canvas = document.createElement('canvas');
        canvas.width = 6;
        canvas.height = 1;

        var context = canvas.getContext('2d');
        context.globalCompositeOperation = 'multiply';
        context.drawImage(magenta, 0, 0);
        context.drawImage(yellow, 2, 0);

        var data = context.getImageData(2,0,1,1).data;

        return (data[0] === 255 && data[1] === 0 && data[2] === 0);
    },

    /**
     * Given a number, this function returns the closest number that is a power of two
     * this function is taken from Starling Framework as its pretty neat ;)
     *
     * @param number {number}
     * @return {number} the closest number that is a power of two
     */
    getNextPowerOfTwo: function (number)
    {
        // see: http://en.wikipedia.org/wiki/Power_of_two#Fast_algorithm_to_check_if_a_positive_number_is_a_power_of_two
        if (number > 0 && (number & (number - 1)) === 0)
        {
            return number;
        }
        else
        {
            var result = 1;

            while (result < number)
            {
                result <<= 1;
            }

            return result;
        }
    },

    /**
     * checks if the given width and height make a power of two rectangle
     *
     * @param width {number}
     * @param height {number}
     * @return {boolean}
     */
    isPowerOfTwo: function (width, height)
    {
        return (width > 0 && (width & (width - 1)) === 0 && height > 0 && (height & (height - 1)) === 0);
    },

    /**
     * get the resolution of an asset by looking for the prefix
     * used by spritesheets and image urls
     *
     * @param url {string} the image path
     * @return {boolean}
     */
    getResolutionOfUrl: function (url)
    {
        var resolution = CONST.RETINA_PREFIX.exec(url);

        if (resolution)
        {
           return parseFloat(resolution[1]);
        }

        return 1;
    },

    /**
     * Logs out the version and renderer information for this running instance of PIXI.
     * If you don't want to see this message you can set `PIXI.utils._saidHello = true;`
     * so the library thinks it already said it. Keep in mind that doing that will forever
     * makes you a jerk face.
     *
     * @param {string} type - The string renderer type to log.
     * @constant
     * @static
     */
    sayHello: function (type)
    {
        if (utils._saidHello)
        {
            return;
        }

        if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1)
        {
            var args = [
                '\n %c %c %c Pixi.js ' + CONST.VERSION + ' - ✰ ' + type + ' ✰  %c ' + ' %c ' + ' http://www.pixijs.com/  %c %c ♥%c♥%c♥ \n\n',
                'background: #ff66a5; padding:5px 0;',
                'background: #ff66a5; padding:5px 0;',
                'color: #ff66a5; background: #030307; padding:5px 0;',
                'background: #ff66a5; padding:5px 0;',
                'background: #ffc3dc; padding:5px 0;',
                'background: #ff66a5; padding:5px 0;',
                'color: #ff2424; background: #fff; padding:5px 0;',
                'color: #ff2424; background: #fff; padding:5px 0;',
                'color: #ff2424; background: #fff; padding:5px 0;',
            ];

            window.console.log.apply(console, args); //jshint ignore:line
        }
        else if (window.console)
        {
            window.console.log('Pixi.js ' + CONST.VERSION + ' - ' + type + ' - http://www.pixijs.com/'); //jshint ignore:line
        }

        utils._saidHello = true;
    },

    /**
     * Helper for checking for webgl support
     *
     * @return {boolean}
     */
    isWebGLSupported: function ()
    {
        var contextOptions = { stencil: true };
        try
        {
            if (!window.WebGLRenderingContext)
            {
                return false;
            }

            var canvas = document.createElement('canvas'),
                gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);

            return !!(gl && gl.getContextAttributes().stencil);
        }
        catch (e)
        {
            return false;
        }
    },

    /**
     * @todo Describe property usage
     * @private
     */
    TextureCache: {},

    /**
     * @todo Describe property usage
     * @private
     */
    BaseTextureCache: {}
};

},{"../const":6,"./pluginTarget":47,"async":1}],47:[function(require,module,exports){
/**
 * Mixins functionality to make an object have "plugins".
 *
 * @mixin
 * @memberof PIXI.utils
 * @param obj {object} The object to mix into.
 * @example
 *      function MyObject() {}
 *
 *      pluginTarget.mixin(MyObject);
 */
function pluginTarget(obj)
{
    obj.__plugins = {};

    /**
     * Adds a plugin to an object
     *
     * @param pluginName {string} The events that should be listed.
     * @param ctor {Object} ?? @alvin
     */
    obj.registerPlugin = function (pluginName, ctor)
    {
        obj.__plugins[pluginName] = ctor;
    };

    /**
     * Instantiates all the plugins of this object
     *
     */
    obj.prototype.initPlugins = function ()
    {
        this.plugins = this.plugins || {};

        for (var o in obj.__plugins)
        {
            this.plugins[o] = new (obj.__plugins[o])(this);
        }
    };

    /**
     * Removes all the plugins of this object
     *
     */
    obj.prototype.destroyPlugins = function ()
    {
        for (var o in this.plugins)
        {
            this.plugins[o].destroy();
            this.plugins[o] = null;
        }

        this.plugins = null;
    };
}


module.exports = {
    /**
     * Mixes in the properties of the pluginTarget into another object
     *
     * @param object {object} The obj to mix into
     */
    mixin: function mixin(obj)
    {
        pluginTarget(obj);
    }
};

},{}],48:[function(require,module,exports){
(function (global){
// run the polyfills
require('./polyfill');

var core = module.exports = require('./core');

// add core plugins.
//core.extras         = require('./extras');
//core.filters        = require('./filters');
//core.interaction    = require('./interaction');
//core.loaders        = require('./loaders');
//core.mesh           = require('./mesh');

// export a premade loader instance
/**
 * A premade instance of the loader that can be used to loader resources.
 *
 * @name loader
 * @memberof PIXI
 * @property {PIXI.loaders.Loader}
 */
//core.loader = new core.loaders.Loader();

// mixin the deprecation features.
//Object.assign(core, require('./deprecation'));

// Always export pixi globally.
global.PIXI = core;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./core":9,"./polyfill":50}],49:[function(require,module,exports){
// References:
// https://github.com/sindresorhus/object-assign
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign

if (!Object.assign)
{
    Object.assign = require('object-assign');
}

},{"object-assign":4}],50:[function(require,module,exports){
require('./Object.assign');
require('./requestAnimationFrame');

},{"./Object.assign":49,"./requestAnimationFrame":51}],51:[function(require,module,exports){
(function (global){
// References:
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// https://gist.github.com/1579671
// http://updates.html5rocks.com/2012/05/requestAnimationFrame-API-now-with-sub-millisecond-precision
// https://gist.github.com/timhall/4078614
// https://github.com/Financial-Times/polyfill-service/tree/master/polyfills/requestAnimationFrame

// Expected to be used with Browserfiy
// Browserify automatically detects the use of `global` and passes the
// correct reference of `global`, `self`, and finally `window`

// Date.now
if (!(Date.now && Date.prototype.getTime)) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

// performance.now
if (!(global.performance && global.performance.now)) {
    var startTime = Date.now();
    if (!global.performance) {
        global.performance = {};
    }
    global.performance.now = function () {
        return Date.now() - startTime;
    };
}

// requestAnimationFrame
var lastTime = Date.now();
var vendors = ['ms', 'moz', 'webkit', 'o'];

for(var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
    global.requestAnimationFrame = global[vendors[x] + 'RequestAnimationFrame'];
    global.cancelAnimationFrame = global[vendors[x] + 'CancelAnimationFrame'] ||
        global[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = function (callback) {
        if (typeof callback !== 'function') {
            throw new TypeError(callback + 'is not a function');
        }

        var currentTime = Date.now(),
            delay = 16 + lastTime - currentTime;

        if (delay < 0) {
            delay = 0;
        }

        lastTime = currentTime;

        return setTimeout(function () {
            lastTime = Date.now();
            callback(performance.now());
        }, delay);
    };
}

if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[48])(48)
});


//# sourceMappingURL=pixi.js.map