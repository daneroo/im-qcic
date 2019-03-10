import Head from 'next/head'
import Link from 'next/link'
import Logo from './Logo'
import classNames from 'classnames'
import { withStyles } from '@material-ui/core/styles'

const styles = theme => ({
  container: {
    marginBottom: theme.spacing.unit * 3 // was 25px
  },
  a: {
    // color: theme.palette.shades.light.text.disabled, // similar
    color: theme.palette.grey[500], // #9e9e9e
    '&:hover': {
      color: theme.palette.common.black
    },
    fontSize: 14,
    marginRight: theme.spacing.unit * 2 // was 15
  },
  aactive: {
    color: theme.palette.common.black
  }
})

const menuItems = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/theme', name: 'Theme' },
  { path: '/error', name: 'Error (404)' }
]

function title (pathname) {
  for (let m of menuItems) {
    if (m.path === pathname) {
      return m.name
    }
  }
  return ''
}

const Header = props => {
  const { pathname, classes } = props
  const { container, a, aactive } = classes
  return (
    <header className={container}>
      <Head>
        <title>{title(pathname)}</title>
      </Head>
      <Logo />
      {menuItems.map(m => <Link key={m.path} prefetch href={m.path}>
        <a className={classNames(a, { [aactive]: (pathname === m.path) })}>{m.name}</a>
      </Link>)}
    </header>
  )
}

export default withStyles(styles, { withTheme: true })(Header)
// export default Header;
