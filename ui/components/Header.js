import Link from 'next/link'

export default ({ pathname }) => (
  <header>
    <Link prefetch href='/'>
      <a className={pathname === '/' && 'is-active'}>Home</a>
    </Link>

    <Link prefetch href='/about'>
      <a className={pathname === '/about' && 'is-active'}>About</a>
    </Link>

    <Link prefetch href='/table'>
      <a className={pathname === '/table' && 'is-active'}>Table</a>
    </Link>

    <style jsx>{`
      header {
        margin-bottom: 25px;
      }
      a {
        color: #999999
        font-size: 14px;
        margin-right: 15px;
        text-decoration: none;
      }
      a:hover {
        color: #000000
      }
      .is-active {
        color: #000000
        // text-decoration: underline;
      }
    `}</style>
  </header>
)
