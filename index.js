function debug() {
  console.log(JSON.stringify(history, ' ', 4))
}

module.exports = function (options) {
  const ms = options.ms
  const limit = options.limit
  const ignoreIp = !!options.ignoreIp

  if (!ms) {
    throw new Error('Missing options: ms')
  }
  if (!limit) {
    throw new Error('Missing options: limit')
  }

  const history = {}


  setInterval(function () {
    let now = Date.now()
    for (let ip in history) {
      if (now - history[ip].lastAccess > ms) {
        delete history[ip]
      }
    }
    // debug()
  }, 1000 * 60 * 15) // clean very 15min

  return (req, res, next) => {
    let ip = ignoreIp ? '*' : req.ip
    let now = Date.now()
    let host = history[ip]

    if (host) {
      // debug()
      let list = host.list
      if (list.length >= limit && now - list[0] < ms) {
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
      history[ip] = {
        lastAccess: now,
        list: [now]
      }
      next()
    }
  }
}