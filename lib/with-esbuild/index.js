import esbuild from 'esbuild'

export default function (fn) {
  let service

  return async function (...args) {
    if (!service) {
      service = await esbuild.startService()
      process.on('exit', () => {
        service.stop()
      })
    }

    return fn(service, ...args)
  }
}
