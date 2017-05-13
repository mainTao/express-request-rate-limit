'use strict'

function limitInRange(val, min, max) {
  if (val > max) {
    return max
  }
  if (val < min) {
    return min
  }
  return val | 0 // to integer, floor
}

module.exports = function (defaultOptions) {
  return function (options) {
    let opt = Object.assign({}, defaultOptions, options)
    let {ms, limit, keyFn, onLimit, qps} = opt
    if (!ms) {
      throw new Error('Missing options: ms')
    }
    if (!limit) {
      throw new Error('Missing options: limit')
    }

    const history = {}
    const maxInterval = 1000 * 60 * 5 // 5 min
    const minInterval = 1000 * 5 // 5 sec
    const bestWithinCount = 5000 // if more than 5000 to clear, maybe hang the request
    let gcInterval = qps ? bestWithinCount / qps * 1000 : minInterval
    gcInterval = limitInRange(gcInterval, minInterval, maxInterval)

    let cleanHistory = () => {
      let now = Date.now()
      let removedCount = 0

      for (let key in history) {
        let list = history[key]
        let lastTimestamp = list[list.length - 1]
        if (now - lastTimestamp > ms) {
          removedCount += list.length
          delete history[key]
        }
      }

      if (!qps) { // not specify QPS, use smart-estimate
        gcInterval = gcInterval / ((removedCount + 1) / bestWithinCount) // if removedCount == 0, + 1 to avoid divided by zero error
        gcInterval = limitInRange(gcInterval, minInterval, maxInterval)
      }
      if (opt.debug) {
        console.log(`limit[${opt.name}] GC! removedCount=${removedCount}, gcInterval=${gcInterval}`)
      }
      setTimeout(cleanHistory, gcInterval)
    }

    setTimeout(() => cleanHistory(), gcInterval)

    return (req, res, next) => {
      let key = typeof keyFn === 'function' ? keyFn(req) : '*'
      let now = Date.now()
      let list = history[key]
      if(opt.debug){
        console.log(`limit[${opt.name}] request! gcInterval=${gcInterval}: `, JSON.stringify(history, ' ', 4))
      }
      if (list) {
        if (list.length >= limit && now - list[0] < ms) { // should block
          if (typeof onLimit === 'function') {
            return onLimit(req, res)
          }
          let err = new Error('Too many requests')
          err.status = 429
          return next(err)
        }
        else {
          if (list.length === limit) {
            list.shift()
          }
          list.push(now)
          return next()
        }
      }
      else {
        history[key] = [now]
        next()
      }
    }
  }
}