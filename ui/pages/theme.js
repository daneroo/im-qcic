import Page from '../components/Page'
import Header from '../components/Header'
import ThemeJSON from '../components/ThemeJSON'

export default (props) => (
  <Page>
    <Header pathname={props.url.pathname} />
    <ThemeJSON />
  </Page>
)
