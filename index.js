module.exports = function (options) {
  const ms = options.ms
  const limit = options.limit
  const keyFn = options.keyFn
  const onReachLimit = options.onReachLimit

  if (!ms) {
    throw new Error('Missing options: ms')
  }
  if (!limit) {
    throw new Error('Missing options: limit')
  }

  const history = {}

  function debug() {
    console.log(JSON.stringify(history, ' ', 4))
  }

  setInterval(function () {
    let now = Date.now()
    for (let key in history) {
      if (now - history[key].lastAccess > ms) {
        delete history[key]
      }
    }
  }, 1000 * 60 * 10) // clean very 10min

  return (req, res, next) => {
    let key = typeof keyFn === 'function' ? keyFn(req) : '*'
    let now = Date.now()
    let host = history[key]

    if (host) {
      if(options.debug){
        debug()
      }
      let list = host.list
      if (list.length >= limit && now - list[0] < ms) {
        if(typeof onReachLimit === 'function'){
          return onReachLimit(req, res)
        }
        let err = new Error('Too many requests')
        err.status = 429
        return next(err)
      }
      else {
        if (list.length >= limit) {
          list.shift()
        }
        list.push(now)
        host.lastAccess = now
        return next()
      }
    }
    else {
      history[key] = {
        lastAccess: now,
        list: [now]
      }
      next()
    }
  }
}