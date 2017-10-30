import Page from '../components/Page'
import Header from '../components/Header'
import { withTheme } from 'material-ui/styles';


const Theme = (props) => (
  <Page>
    <Header pathname={props.url.pathname} />
    <pre>{JSON.stringify(props.theme, null, 2)}</pre>
  </Page>
)

export default withTheme()(Theme);
