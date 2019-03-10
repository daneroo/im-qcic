import RemoveRedEye from '@material-ui/icons/RemoveRedEye'
import { withStyles } from '@material-ui/core/styles'

const styles = theme => ({
  container: {
    height: '24px',
    width: '24px',
    position: 'relative',
    display: 'inline-block',
    marginRight: theme.spacing.unit
  },
  icon: {
    height: '20px', width: '20px'
  },
  omega: {
    fontSize: '24px', textAlign: 'center', position: 'absolute'
  }
})

const Logo = props => {
  // const { theme, classes } = props
  const { classes } = props
  return (
    <div className={classes.container}>
      <span className={classes.omega}>ω</span>
      <RemoveRedEye className={classes.icon} color='primary' />
    </div>
  )
}
export default withStyles(styles, { withTheme: true })(Logo)
