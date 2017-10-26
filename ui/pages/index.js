import Page from '../components/App'
import Header from '../components/Header'
import MessageList from '../components/MessageList'
import withData from '../lib/withData'

export default withData((props) => (
  <Page>
    <Header pathname={props.url.pathname} />
    <MessageList />
  </Page>
))
