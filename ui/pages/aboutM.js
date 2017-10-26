import Page from '../components/Page'
import Header from '../components/Header'
import Paper from 'material-ui/Paper';


// export default withRoot(withStyles(styles)(Index));

export default (props) => (
  <Page>
    <Header pathname={props.url.pathname} />
    {/* <Paper style={{ margin: 40 }} elevation={4} >
      ... Cards
    </Paper> */}
    <article>
      <h1>The Idea Behind This Example</h1>

      <h2>Next.js</h2>
      <p>Server-side rendered, React based framework</p>

      <h2>Material-ui</h2>
      <p>Using <a href="https://material-ui-next.com/" target="_blank">material-ui (next)</a></p>
      <p>Styling:... _document.js, withRoot HOC, /style/getContext(defines theme) inine</p>
      <ul>
        <li>/style/getContext.js: creates material theme and jss sheetmanager. This is where we can override the material theme properties</li>
        <li>_document.js: replaces next.js default document includes head element, calls /styles/getContext</li>
        <li>withRoot HOC: injects MuiThemeProvider with configured theme, also calls /styles.getContext.js, but also has some global css, meant to be a reset</li>
        <li>Page: our convenience componenent, wraps withRoot, no longer has global styles</li>
        <li>inline jsx:</li>
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
