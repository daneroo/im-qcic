import React, { Component } from "react";
import Button from 'material-ui/Button';
import Paper from 'material-ui/Paper';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';
import TextField from 'material-ui/TextField';
import { withStyles } from 'material-ui/styles';

import ulid from 'ulid'
import { gql, graphql, withApollo } from "react-apollo";
import {
  GET_MESSAGES_QUERY,
  ON_NEW_MESSAGE_SUBSCRIPTION,
  MUTATE_MESSAGE
} from '../lib/queries'

const styles = theme => ({
  container: {
    // display: 'flex',
    flexWrap: 'wrap',
  },
  formElements: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    // width: 200,
  }
});
//@withApollo - react-scripts do not yet support decorators - https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#can-i-use-decorators
class MessageList extends Component {

  constructor() {
    super();
  }


  state = {
    message: 'Hello all',
    topic: 'chat.demo'
  };

  // handles all textFields
  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };

  // -=-= Mutation
  onMutationSubmit = () => {
    this.props.client.mutate({
      operationName: "AddMessage",
      mutation: MUTATE_MESSAGE,
      variables: {
        stamp: new Date().toISOString(),
        host: 'browser',
        text: this.state.message
      }
    });
  };

  // -=-= Subscription
  // Perform a refetch and subscribe on mount
  componentWillMount() {
    this.props.data.refetch()

    // subscribe to new messages
    if (process.browser) {
      this.unsubscribe = this.props.subscribeToNewMessages();
    }

  }

  // unsubscribe on unmount
  componentWillUnmount = () => {
    if (process.browser && this.unsubscribe) {
      this.unsubscribe();
      delete this.unsubscribe
    }
  };

  render() {
    const { classes } = this.props;
    const { data: { loading, error, messges } } = this.props;

    if (loading) {
      return <p>Loading...</p>;
    } else if (error) {
      return <p>Error!</p>;
    }
    return (
      <main>
        <form className={classes.container} noValidate autoComplete="off">
          <TextField
            id="message"
            label="Message"
            className={classes.formElements}
            value={this.state.message}
            onChange={this.handleChange('message')}
            helperText="The text that will be broadcast"
          />
          <TextField
            id="topic"
            label="Topic"
            className={classes.formElements}
            value={this.state.topic}
            onChange={this.handleChange('topic')}
            helperText="The channel it is sent on"
          />
          <Button raised color="primary" className={classes.formElements} onClick={this.onMutationSubmit.bind(this)}>Send</Button>
          {/* <Button raised color="accent" onClick={this.onMutationSubmit.bind(this)}>Send</Button> */}
        </form>

        <Paper style={{ margin: 40 }} elevation={0} >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>id</TableCell>
                <TableCell numeric>Stamp</TableCell>
                <TableCell numeric>Host</TableCell>
                <TableCell numeric>Text</TableCell>
                <TableCell numeric> Δ Origin (ms)</TableCell>
                <TableCell numeric> Δ Server (ms)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.props.data.messages.map(m => {
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.id.slice(-5)}</TableCell>
                    <TableCell numeric>{m.stamp}</TableCell>
                    <TableCell numeric>{m.host}</TableCell>
                    <TableCell numeric>{m.text}</TableCell>
                    <TableCell numeric>{m.delta}</TableCell>
                    <TableCell numeric>{m.deltaServer}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <pre>{JSON.stringify(this.props.data.messages.slice(-1)[0])}</pre>
        </Paper>
      </main>
    );
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
                return prev;
              }

              const newMessage = subscriptionData.data.newMessage;

              const delta = +new Date() - new Date(newMessage.stamp)
              newMessage.delta = delta
              const serverStamp = ulid.decodeTime(newMessage.id)
              newMessage.deltaServer = +new Date() - new Date(serverStamp)


              console.log('newMessage', JSON.stringify(newMessage))
              // return prev
              return Object.assign({}, prev, {
                messages: [...prev.messages.slice(-messagesToKeep), newMessage]
              });
            }
          });
        }
      };
    }
  }
)(withApollo(withStyles(styles)(MessageList)))
