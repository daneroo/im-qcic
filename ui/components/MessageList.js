import React, { Component } from "react";
import ulid from 'ulid'
import { gql, graphql, withApollo } from "react-apollo";
import {
  GET_MESSAGES_QUERY,
  ON_NEW_MESSAGE_SUBSCRIPTION,
  MUTATE_MESSAGE
} from '../lib/queries'

//@withApollo - react-scripts do not yet support decorators - https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#can-i-use-decorators
class MessageList extends Component {

  constructor() {
    super();
    this.state = {
      messageList: []
    };
    this.mutationMessage = "Blablabla";
  }

  componentWillReceiveProps = (nextProps) => {
    if (!nextProps.data.loading) {

      this.setState({
        messageList: [...nextProps.data.messages]
      });

      if (this.subscription) {
        if (nextProps.data.messages !== this.props.data.messages) {
          // if the feed has changed, we need to unsubscribe before resubscribing
          this.unsubscribe();
        } else {
          // we already have an active subscription with the right params
          return;
        }
      }

      this.unsubscribe = nextProps.data.subscribeToMore({
        document: ON_NEW_MESSAGE_SUBSCRIPTION,
        // variables: {
        //   userId: authToken
        // },
        // this is where the magic happens.
        updateQuery: this.updateQuery,
        onError: (err) => console.error(err),
      });
    }
  };

  componentWillUnmount = () => {
    // The subscribeToMore subscription is stopped automatically when its dependent query is stopped,
    // so we don’t need to unsubscribe manually. 
    // this.onUnsubscribe();
  };

  updateQuery = (prev, { subscriptionData }) => {
    const newMessage = subscriptionData.data.newMessage;
    return this.onNewMessage(newMessage);
  };

  onNewMessage = (message) => {
    const messagesToKeep = 10
    const delta = +new Date() - new Date(message.stamp)
    message.delta = delta
    const serverStamp = ulid.decodeTime(message.id)
    message.deltaServer = +new Date() - new Date(serverStamp)

    let messages = [...this.state.messageList, message].slice(-messagesToKeep);
    this.setState({
      messageList: messages
    });
    //  this return was causing 'Missing field messages in [{...}]
    // return messages;
  };

  updateMutationMessage = (event) => {
    this.mutationMessage = event.target.value;
  };

  onMutationSubmit = () => {
    this.props.client.mutate({
      operationName: "AddMessage",
      mutation: MUTATE_MESSAGE,
      variables: {
        stamp: new Date().toISOString(),
        host: 'browser',
        text: this.mutationMessage
      }
    });
  };

  onUnsubscribe = () => {
    this.unsubscribe();
  };

  render() {
    const { loading } = this.props.data;
    return (
      <main>
        <header>
          <h1>Apollo Client Subscription Example</h1>
        </header>

        <input type="text" onChange={this.updateMutationMessage.bind(this)} defaultValue={this.mutationMessage} />
        <input type="button" onClick={this.onMutationSubmit.bind(this)} value="Mutate" /> &nbsp;
        <input type="button" onClick={this.onUnsubscribe.bind(this)} value="Unsubscribe" />

        {loading ? (<p>Loading…</p>) : (
          <ul> {this.state.messageList.map((m, idx) => (
            <li key={m.id}>
              <span>{m.stamp}</span>
              <span className="host">{m.host}</span>
              <span>{m.text}</span>
              <span>{m.delta ? <span>Δ {m.delta} ms</span> : ''}</span>
              <span>{m.deltaServer ? <span>Δ {m.deltaServer} ms</span> : ''}</span>
            </li>))}
          </ul>)}

        <style jsx>{`
          span {
            margin-right: 25px;
          }
          span.host {
            display: inline-block;
            width: 5em;
          }
        `}</style>

      </main>
    );
  }
}

export default graphql(
  GET_MESSAGES_QUERY
)(withApollo(MessageList))
