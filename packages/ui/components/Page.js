// applies global styles, and withRoot for Material UI Theme

import { withStyles } from '@material-ui/core/styles'
import withRoot from '../lib/withRoot'

const styles = theme => ({
  '@global': {
    body: {
      // 'font-family': "'Roboto', sans-serif",
      fontFamily: ['Roboto', 'sans-serif'],
      margin: 0,
      padding: '25px 50px;'
    },
    a: {
      color: theme.palette.primary[500], // blue for now
      '&:hover': {
        color: theme.palette.common.black
      },
      textDecoration: 'none'
    }
  }
})

export default withRoot(withStyles(styles)(({ children }) => (
  <main>
    {children}
    {/* Global style for all <Page /> elements, this is applied to late!!! */}
    {/* Moved to global in withRoot */}
  </main>
)))
