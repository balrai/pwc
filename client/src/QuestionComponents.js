import React, { Component } from "react";
import { Button } from "reactstrap";

export class Votes extends Component {
  constructor(props) {
    super(props);
    this.handleMessage = this.handleMessage.bind(this);
    this.state = {
      votes: props.votes
    };
  }

  handleMessage(topic, message) {
    const m = JSON.parse(String(message));
    switch (m.path) {
      case "upvotequestion":
        if (m.data.questionId === this.props.questionId) {
          this.setState({
            votes: m.data.votes
          });
        }
        break;
      default:
        break;
    }
  }

  componentDidMount() {
    this.props.client.on("message", this.handleMessage);
  }

  componentWillUnmount() {
    this.props.client.removeListener("message", this.handleMessage);
  }

  render() {
    return <div>{this.state.votes}</div>;
  }
}

export class ActionMenu extends Component {
  constructor(props) {
    super(props);
    this.upvote = this.upvote.bind(this);
    this.state = { voted: false };
  }

  render() {
    if (!this.state.voted) {
      return (
        <Button color="link" onClick={this.upvote}>
          Upvote
        </Button>
      );
    } else {
      return "Upvoted";
    }
  }

  upvote() {
    this.props.upvote();
    this.setState({ voted: true });
  }
}
