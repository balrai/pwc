import React, { Component } from "react";

import event_logo from "../images/event_logo.png";
import voteON from "../images/thumb_on.png";
import voteOFF from "../images/thumb_off.png";
import forum from "../images/forum.png";

export default class Event extends Component {
  constructor(props) {
    super(props);
    this.state = {
      question: "",
      anonymous: false
    };
  }

  render_vote(question) {
    let add = true;
    if (this.props.voted_list.length > 0) {
      this.props.voted_list.filter(vote => {
        if (vote === question.questionId) {
          add = false;
        }
      });
    }

    if (add) {
      return (
        <div
          className="vote"
          type="button"
          onClick={() => this.props.upvote(question.questionId)}
        >
          <img src={voteON} alt="vote ON" id="voteON" />
          <span className="vote_text">&nbsp;Vote</span>
        </div>
      );
    } else {
      return (
        <div className="vote" type="button">
          <img src={voteOFF} alt="vote OFF" id="voteOFF" />
          <span className="vote_text">&nbsp;Vote</span>
        </div>
      );
    }
  }

  render() {
    return (
      <div className={this.props.display}>
        <div className="event-head">
          <img src={event_logo} alt="logo" />
          <div className="vertical-bar" />
          <div className="event-heading">CaTSH Partner Conference 2019</div>
          <div className="logout" onClick={() => this.props.signout()}>
            Logout
          </div>
        </div>
        <div className="line" />
        <div className="content">
          <div className="left">
            <div id="playerElement" />
            <div id="playerBackupElement" />
          </div>
          <div className="right">
            <div className="right-heading">
              <img src={forum} alt="Forum logo" id="forum-logo" />
              <div className="forum-info">
                *You can upvote the approved question only once.
              </div>
            </div>
            <div id="qna">
              {this.props.questions.map(question => (
                <div className="question" key={question.questionId}>
                  <div className="top-box">
                    <div className="name" />
                    <div className="inside-box">
                      <div className="vote-counts">{question.votes} votes</div>

                      {this.render_vote(question)}
                    </div>
                  </div>

                  <div className="text"> {question.question}</div>
                </div>
              ))}
            </div>
            <div className="submit-form">
              <form id="text-form">
                <textarea
                  type="text"
                  name="question"
                  id="question"
                  placeholder="Type your questions here..."
                  onChange={e => this.setState({ question: e.target.value })}
                  value={this.state.question}
                />
                <button
                  type="button"
                  onClick={() => {
                    this.props.submit(
                      this.state.question,
                      this.state.anonymous
                    );
                    this.setState({ question: "" });
                  }}
                  id="submit-question"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
