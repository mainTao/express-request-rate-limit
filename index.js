module.exports = function (options) {
  let ms = options.ms
  let limit = options.limit

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
    for (let ip in history) {
      if (now - history[ip].lastAccess > ms) {
        delete history[ip]
      }
    }
    // debug()
  }, 1000 * 60 * 15) // clean very 15min


  return (req, res, next) => {
    let ip = req.ip.replace(/^.*:/, '')
    if (!ip) {
      return next()
    }

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