import React, { Component } from 'react'
import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import TextField from '@material-ui/core/TextField'
import { withStyles } from '@material-ui/core/styles'

import { decodeTime } from 'ulid'
import { graphql, withApollo } from 'react-apollo'
import {
  GET_MESSAGES_QUERY,
  ON_NEW_MESSAGE_SUBSCRIPTION,
  MUTATE_MESSAGE
} from '../lib/queries'

const styles = theme => ({
  paper: theme.mixins.gutters({
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: theme.spacing.unit * 3
  }),

  form: {
    // display: 'flex',
    flexWrap: 'wrap'
  },
  formElements: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit
    // width: 200,
  }
})
// @withApollo - react-scripts do not yet support decorators - https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#can-i-use-decorators
class MessageList extends Component {
  // constructor () {
  //   super()
  // }

  state = {
    message: 'Hello all',
    topic: 'chat.demo'
  };

  // handles all textFields
  handleChange = name => event => {
    this.setState({
      [name]: event.target.value
    })
  };

  // -=-= Mutation
  onMutationSubmit = () => {
    this.props.client.mutate({
      operationName: 'AddMessage',
      mutation: MUTATE_MESSAGE,
      variables: {
        stamp: new Date().toISOString(),
        host: 'browser',
        text: this.state.message
      }
    })
  };

  // -=-= Subscription
  // Perform a refetch and subscribe on mount
  componentWillMount () {
    this.props.data.refetch()

    // subscribe to new messages
    if (process.browser) {
      this.unsubscribe = this.props.subscribeToNewMessages()
    }
  }

  // unsubscribe on unmount
  componentWillUnmount = () => {
    if (process.browser && this.unsubscribe) {
      this.unsubscribe()
      delete this.unsubscribe
    }
  };

  render () {
    const { classes } = this.props
    const { data: { loading, error } } = this.props

    if (loading) {
      return <p>Loading...</p>
    } else if (error) {
      return <p>Error!</p>
    }
    return (
      <main>
        <Paper className={classes.paper} elevation={1} >
          <form className={classes.form} noValidate autoComplete='off'>
            <TextField
              id='message'
              label='Message'
              className={classes.formElements}
              value={this.state.message}
              onChange={this.handleChange('message')}
              helperText='The text that will be broadcast'
            />
            <TextField
              id='topic'
              label='Topic'
              className={classes.formElements}
              value={this.state.topic}
              onChange={this.handleChange('topic')}
              helperText='The channel it is sent on'
            />
            <Button variant='raised' color='primary' className={classes.formElements} onClick={this.onMutationSubmit.bind(this)}>Send</Button>
            {/* <Button variant="raised" color="accent" onClick={this.onMutationSubmit.bind(this)}>Send</Button> */}
          </form>
        </Paper>

        <Paper className={classes.paper} elevation={1} >
          <pre>{JSON.stringify(this.props.data.messages.slice(-1)[0])}</pre>
        </Paper>

        <Paper className={classes.paper} elevation={1} >
          <Table>
            <TableHead>
              <TableRow>
                {<TableCell>id</TableCell>}
                <TableCell>Stamp</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Text</TableCell>
                {/* <TableCell numeric> Δ Origin (ms)</TableCell> */}
                {/* <TableCell numeric> Δ Server (ms)</TableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {this.props.data.messages.map(m => {
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.id.slice(-5)}</TableCell>
                    <TableCell>{m.stamp}</TableCell>
                    <TableCell>{m.host}</TableCell>
                    <TableCell>{m.text}</TableCell>
                    {/* <TableCell numeric>{m.delta}</TableCell> */}
                    {/* <TableCell numeric>{m.deltaServer}</TableCell> */}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      </main>
    )
  }
}

export default graphql(
  GET_MESSAGES_QUERY, {
    props: props => {
      return {
        ...props,
        subscribeToNewMessages: params => {
          return props.data.subscribeToMore({
            document: ON_NEW_MESSAGE_SUBSCRIPTION,
            onError: (err) => console.error(err),
            updateQuery: (prev, { subscriptionData }) => {
              const messagesToKeep = 4

              if (!subscriptionData.data) {
                return prev
              }

              const newMessage = subscriptionData.data.newMessage

              const delta = +new Date() - new Date(newMessage.stamp)
              newMessage.delta = delta
              const serverStamp = decodeTime(newMessage.id)
              newMessage.deltaServer = +new Date() - new Date(serverStamp)

              console.log('newMessage', JSON.stringify(newMessage))
              // return prev
              return Object.assign({}, prev, {
                messages: [...prev.messages.slice(-messagesToKeep), newMessage]
              })
            }
          })
        }
      }
    }
  }
)(withApollo(withStyles(styles)(MessageList)))
