import Page from '../components/Page'
import Header from '../components/Header'
import { withRouter } from 'next/router'
import { withTheme } from '@material-ui/core/styles'

const Theme = (props) => (
  <Page>
    <Header pathname={props.router.pathname} />
    <pre>{JSON.stringify(props.theme, null, 2)}</pre>
  </Page>
)

export default withRouter(withTheme()(Theme))
