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
      messageList: ["What??"]
    };
    this.mutationMessage = "Blablabla";
    console.log('CONSTRUCTOR')
  }

  componentWillReceiveProps = (nextProps) => {
    if (!nextProps.data.loading) {

      console.log('use',ON_NEW_MESSAGE_SUBSCRIPTION)
      console.log('nextProps',nextProps)
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
    let messages = [...this.state.messageList, message];
    this.setState({
      messageList: messages
    });
    return messages;
  };

  updateMutationMessage = (event) => {
    this.mutationMessage = event.target.value;
  };

  updateBroadcastFlag = (event) => {
    this.broadcast = event.target.checked;
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
            Open <a href="http://localhost:5000/graphiql">GraphiQL</a> and submit the following mutation:
            <br />
            <br />
          </p>
          <pre>
            mutation AddMessage {'{\n    '}
              addMessage(message: "Hello Apollo Subscriptions")
            {'\n}\n'}
          </pre>
          <p>
            <br />
            You should see a console entry in this window with the above message.
          </p>
        </header>

        <input type="text" onChange={this.updateMutationMessage.bind(this)} defaultValue={this.mutationMessage}/>
        <input type="button" onClick={this.onMutationSubmit.bind(this)} value="Mutate"/>
        <br />
        <span>Broadcast</span>
        <input type="checkbox" onChange={this.updateBroadcastFlag.bind(this)} defaultValue={this.broadcast}/>
        <input type="button" onClick={this.onUnsubscribe.bind(this)} value="Unsubscribe"/>

        { loading ? (<p>Loadingeroo…</p>) : (
          <ul> { this.state.messageList.map(entry => (
            <li>{entry}</li>)) }
          </ul> )}
      </main>
    );
  }
}

export default graphql(
  GET_MESSAGES_QUERY
)(withApollo(App))
