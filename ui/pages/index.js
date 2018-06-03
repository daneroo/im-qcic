import React from 'react'
import Page from '../components/Page'
import Header from '../components/Header'
import MessageList from '../components/MessageList'
import { withRouter } from 'next/router'

class Index extends React.Component {
  render () {
    const {router} = this.props
    return <Page>
      <Header pathname={router.pathname} />
      <MessageList />
    </Page>
  }
}

export default withRouter(Index)
