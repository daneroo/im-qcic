import React from 'react'
import { withRouter } from 'next/router'
import Page from '../components/Page'
import Header from '../components/Header'
import { withStyles } from '@material-ui/core/styles'

// Nested' article p': {style}
const styles = theme => ({
  article: {
    margin: [0, 'auto'],
    maxWidth: 650,
    '& p': {
      color: theme.palette.grey[700], // #616161
      fontSize: 14,
      lineHeight: '24px' // must have units
    }
  }
})

class About extends React.Component {
  render () {
    const {router} = this.props
    const { article } = this.props.classes

    return (
      <Page>
        <Header pathname={router.pathname} />
        <article className={article}>
          <h1>The Idea Behind This Example</h1>

          <h2>Next.js</h2>
          <p><a href='https://github.com/zeit/next.js/'>Next.js</a> is a server-side rendered, React based framework</p>

          <h2>Material-ui</h2>
          <p>Using <a href='https://material-ui-next.com/' target='_blank'>material-ui (next)</a></p>
          <h3>Styling:</h3>
          <ul>
            <li>
              /style/getContext.js:
              <p>
                creates material theme and jss sheetmanager. This is where we can override the material theme properties

              </p>
            </li>
            <li>
              _document.js:
              <p>replaces next.js default document includes head element, calls /styles/getPageContext</p>
            </li>
            <li>
              withRoot HOC:
              <p>injects MuiThemeProvider with configured theme, also calls /styles.getContext.js, but also has some global css, meant to be a reset</p>
            </li>
            <li>
              Page:
              <p>our convenience componenent, wraps withRoot, no longer has global styles</p>
            </li>
            <li>
              inline jsx:
              <p>
                when using the <a href='https://github.com/zeit/styled-jsx#server-side-rendering' taget='blank'>style-jsx</a> tag, wether global or not, you must take care to leverage SSR.
                <br />
                <tt>
                  &lt;style [global] jsx&gt; <br />
                  p {'{'}  <br />
                  color: red; <br />
                  {'}'} <br />
                  &lt;/style&gt;
                </tt>
              </p>
            </li>
          </ul>
          <h2>GraphQL</h2>
          <p>
            <a href='http://dev.apollodata.com'>Apollo</a> is a GraphQL client that allows you to easily query the exact data you need from a GraphQL server. In addition to fetching and mutating data, Apollo analyzes your queries and their results to construct a client-side cache of your data, which is kept up to date as further queries and mutations are run, fetching more results from the server.
          </p>
          <p>
            In this simple example, we integrate Apollo seamlessly with <a href='https://github.com/zeit/next.js'>Next</a> by wrapping our pages inside a <a href='https://facebook.github.io/react/docs/higher-order-components.html'>higher-order component (HOC)</a>. Using the HOC pattern we're able to pass down a central store of query result data created by Apollo into our React component hierarchy defined inside each page of our Next application.
          </p>
          <p>
            On initial page load, while on the server and inside getInitialProps, we invoke the Apollo method, <a href='http://dev.apollodata.com/react/server-side-rendering.html#getDataFromTree'>getDataFromTree</a>. This method returns a promise; at the point in which the promise resolves, our Apollo Client store is completely initialized.
          </p>
          <p>
            This example relies on <a href='http://graph.cool'>graph.cool</a> for its GraphQL backend.
          </p>
        </article>
      </Page>
    )
  }
}

export default withRouter(withStyles(styles, { withTheme: true })(About))
