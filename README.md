# express-request-rate-limit

An Express middleware to limit request rate.

## Features
* Zero dependency
* Custom way to generate clientId
* Customizable response when reach the limit
* Default smart timer to free memory, according to request rate
* Able to specify QPS(Quest Per Second) to set proper timer interval

## Implement Detail
The middleware use a plain object to record access history. In each object key-value pair, key is clientId, value is a list which contains access timestamp.

When a new request coming, if the list reaches the max limit, the request is not allowed to go further, and rise `429 Too Many Requests` error by default.

The middleware stores history data in Node.js process memory. We start a timer to cleans the history data repeatedly.

## Usage

Follow these steps to use:

1. `require('express-request-rate-limit')` returns a middleware generator. The common options will be applied in all middleware generated by it.
2. Call the generator function to build middleware, you can override the default options in this step.
3. Use the middleware on your router to limit the request rate.

### Basic Usage

For example, we need to limit all the login requests from normal user and administrator, according to different policies:
1. For normal user, set client IP address and user ID to specify a key. Limit rate is 5 times per minute.
2. For administrator, set client IP address to specify a key. Limit rate is 1 time every 5 seconds.

Both of them share the same error response message 'Please try a while later' with status code 429.

```js
const router = express.Router()
const rateLimit = require('express-request-rate-limit')

const loginLimit = rateLimit({
  onLimit: (req, res) => res.status(429).json({msg:'Please try a while later'})
})

const userLoginLimit = loginLimit({
  limit: 5,
  ms: 1000 * 60,
  keyFn: req => {return req.ip + req.user.id}
})

const adminLoginLimit = loginLimit({
  limit: 1,
  ms: 1000 * 5,
  keyFn: req => req.ip
})

router.use('/user/login', userLoginLimit)
router.use('/admin/login', adminLoginLimit)

```

### Debug Mode
If you want to inspect the history data, use debug mode:
```js
const userLoginLimit = loginLimit({
  debug: true,
  name: 'user login',
  // ...
})
```
There may be multiple instances running together, we need to know which one the debug log belongs to. For convenience, we specify its name in options.

### Specify QPS
Some APIs may experience a traffic surge. For example, the QPS suddenly rises from 0 to 1000. In this case, auto-tuning timer is too slow to detect the sudden change. So we should specify QPS to a higher value.

NOTE: the cleaner timer has a range from 5 seconds to 5 minutes. If QPS > 1000, timer interval is 5 seconds. If QPS < 17, timer interval is 5 minutes.
