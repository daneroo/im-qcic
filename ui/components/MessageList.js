import React, { Component } from "react";
import ulid from 'ulid'
import { gql, graphql, withApollo } from "react-apollo";
import {
  GET_MESSAGES_QUERY,
  ON_NEW_MESSAGE_SUBSCRIPTION,
  MUTATE_MESSAGE
} from '../lib/queries'

let stale=false
//@withApollo - react-scripts do not yet support decorators - https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#can-i-use-decorators
class MessageList extends Component {

  constructor() {
    super();
    this.state = {
      staleorama:true
    };

    this.mutationMessage = "Blablabla";
  }

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

  componentWillMount() {
    console.log('componentWillMount: stale', stale)
    if (stale){
      console.log('refetch')
      this.props.data.refetch()
      stale=false      
    }
    if (process.browser) {
      this.unsubscribe = this.props.subscribeToNewMessages();
    }
  }
  componentWillUnmount = () => {
    console.log('componentWillUnmount:')
    if (process.browser && this.unsubscribe) {
      this.unsubscribe();
      delete this.unsubscribe
      stale=true
    }
  };

  render() {
    const { loading } = this.props.data;
    return (
      <main>
        <input type="text" onChange={this.updateMutationMessage.bind(this)} defaultValue={this.mutationMessage} />
        <input type="button" onClick={this.onMutationSubmit.bind(this)} value="Mutate" /> &nbsp;
        {/* <input type="button" onClick={this.onUnsubscribe.bind(this)} value="Unsubscribe" /> */}

        {loading ? (<p>Loading…</p>) : (
          <ul> {this.props.data.messages.map((m, idx) => (
            <li key={m.id}>
              <span><tt>{m.id.slice(-5)}</tt></span>
              <span>{m.stamp}</span>
              <span className="host">{m.host}</span>
              <span>{m.text}</span>
              <span>{m.delta ? <span>Δ {m.delta} ms</span> : ''}</span>
              <span>{m.deltaServer ? <span>Δ {m.deltaServer} ms</span> : ''}</span>
            </li>))}
            <pre>{JSON.stringify(this.props.data.messages.slice(-1), null, 2)}</pre>
          </ul>
        )}


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
                messages: [...prev.messages.slice(-messagesToKeep),newMessage]
              });
            }
          });
        }
      };
    }
  }
)(withApollo(MessageList))
