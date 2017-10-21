import React, { Component } from "react";
import { gql, graphql, withApollo } from "react-apollo";
// import { authToken } from "./net_interface"

const GET_MESSAGES_QUERY = gql`query {
    messages
}`;

const ON_NEW_MESSAGE_SUBSCRIPTION = gql`
    subscription onNewMessage {
        newMessage
    }
`;

const MUTATE_MESSAGE = gql`
    mutation AddMessage($message: String!) {
        addMessage(message: $message)
    }
`;

//@withApollo - react-scripts do not yet support decorators - https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#can-i-use-decorators
class App extends Component {

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

  updateQuery = (prev, {subscriptionData}) => {
    const newMessage = subscriptionData.data.newMessage;
    return this.onNewMessage(newMessage);
  };

  onNewMessage = (message) => {
    const messagesToKeep = 10
    const originStamp = message.split(':').slice(2).join(':')
    const delta = +new Date()-new Date(originStamp)
    message = message + ' Δ '+delta+' ms'
    let messages = [...this.state.messageList, message].slice(-messagesToKeep);
    this.setState({
      messageList: messages
    });
    return messages;
  };

  updateMutationMessage = (event) => {
    this.mutationMessage = event.target.value;
  };

  onMutationSubmit = () => {
     this.props.client.mutate({
       operationName: "AddMessage",
       mutation: MUTATE_MESSAGE,
       variables: { message: this.mutationMessage }
     });
  };

  onUnsubscribe = () => {
    this.unsubscribe();
  };

  render() {
    const {loading} = this.props.data;
    return (
      <main>
        <header>
          <h1>Apollo Client Subscription Example</h1>
          <p>
            Open GraphiQL &nbsp;
            <a target="_blank" href="http://localhost:5000/graphiql?query=query%7Bmessages%7D">Query</a>, &nbsp;
            <a target="_blank" href="http://localhost:5000/graphiql?operationName=AddMessage&query=mutation%20AddMessage%20%7B%20addMessage(message%3A%20%22one%22)%20%7D">Mutate</a>, &nbsp;
            <a target="_blank" href="http://localhost:5000/graphiql?operationName=OnNewMessage&query=subscription%20OnNewMessage%20%7B%20newMessage%20%7D">Subscribe</a>
          </p>
        </header>

        <input type="text" onChange={this.updateMutationMessage.bind(this)} defaultValue={this.mutationMessage}/>
        <input type="button" onClick={this.onMutationSubmit.bind(this)} value="Mutate"/> &nbsp;
        <input type="button" onClick={this.onUnsubscribe.bind(this)} value="Unsubscribe"/>

        { loading ? (<p>Loading…</p>) : (
          <ul> { this.state.messageList.map((message,idx) => (
            <li key={idx}>{message}</li>)) }
          </ul> )}
      </main>
    );
  }
}

export default graphql(
  GET_MESSAGES_QUERY
)(withApollo(App))
