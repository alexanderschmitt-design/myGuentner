import { dmsHealthCheck } from '../../utils/dms'

export default defineEventHandler(async () => {
  return dmsHealthCheck()
})
