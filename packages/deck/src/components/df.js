
import moment from 'moment'

// convert to Localtime
export function df (dateStr, fmt = 'HH:mm') {
  return moment(dateStr).format(fmt)
}
export function dfn (dateStr) {
  return moment(dateStr).fromNow()
}
