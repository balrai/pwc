import React, { Component } from "react";
import { Button, FormGroup, Label, Input } from "reactstrap";

//MQTT (AWS IOT)
import uuidv4 from "uuid/v4";
import AWS from "aws-sdk/global";
import AWSMqttClient from "aws-mqtt";

//HTTP Requests
import request from "request-promise-native";

//Bootstrap Table (For demo display)
import BootstrapTable from "react-bootstrap-table-next";
import paginationFactory from "react-bootstrap-table2-paginator";
import "./App.css";
import { sortCaret } from "./common.js";

import { Votes, ActionMenu } from "./QuestionComponents.js";
import Event from "./components/Event";
import logo from "./images/logo.png";
import footer from "./images/bottom_banner.png";
import footer_app from "./images/bottom_banner_app.png";

//Environment Configs
import { IdentityPoolId, apiEndpoint, iotEndpoint, region } from "./configs.js";
AWS.config.region = region;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: IdentityPoolId
});

//Client for AWS IOT, will be assigned after sign in success
//See signin()
var client;

//For logging messages to page
var logger;
function logToPage(data) {
  if (logger !== undefined) {
    logger(data);
  } else {
    console.log(data);
  }
}

const questions = {};

class App extends Component {
  constructor(props) {
    super(props);
    this.logToPage = this.logToPage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.signin = this.signin.bind(this);
    this.submit = this.submit.bind(this);
    this.signout = this.signout.bind(this);
    this.upvote = this.upvote.bind(this);
    this.addQuestions = this.addQuestions.bind(this);
    logger = this.logToPage;
    this.logs = [];
    this.state = {
      questions: [],
      logs: "",
      joined: false,
      authorizationToken: "",
      sessionId: "2",
      myUsername: "",
      pin: "",
      voted_list: []
    };
  }

  upvote(questionId) {
    let add = true;
    if (this.state.voted_list.length > 0) {
      this.state.voted_list.filter(vote => {
        if (vote === questionId) {
          add = false;
        }
      });
    }

    if (add) {
      this.setState({ voted_list: [...this.state.voted_list, questionId] });
    }
    request({
      method: "POST",
      uri: apiEndpoint + "upvotequestion",
      headers: { Authorization: this.state.authorizationToken },
      body: {
        sessionId: this.state.sessionId,
        questionId: questionId
      },
      json: true // Automatically stringifies the body to JSON
    })
      .then(result => {
        logToPage("Upvoted");
        this.setState({ msg_sent: true });
      })
      .catch(err => {
        console.log(err);
      });
  }

  logToPage(str) {
    this.logs.unshift(str);
    this.setState({
      logs: this.logs.join("\n")
    });
  }

  async componentWillMount() {
    let data = JSON.parse(localStorage.getItem("state"));
    if (data && data.joined) {
      await this.setState({ ...data });
      this.signin();
    }
  }
  componentDidUpdate() {
    localStorage.setItem("state", JSON.stringify(this.state));
  }
  //This is the pub/sub message handler
  handleMessage(topic, message) {
    console.log("new message", JSON.parse(String(message)));
    const m = JSON.parse(String(message));
    switch (m.path) {
      case "approvequestion":
        this.addQuestions([m.data]);
        break;
      case "upvotequestion":
        this.addQuestions([m.data]);
        break;
      case "deletequestion":
        this.removeQuestion(m.data.questionId);
        break;
      case "publishquestion":

      case "signin":
        client.end();
        this.setState({ joined: false });
        break;
      default:
        break;
    }
  }

  componentWillUnmount() {
    if (client) {
      client.end();
    }
  }

  signout() {
    localStorage.removeItem("state");
    client.end();
    this.setState({ joined: false });
  }

  signin() {
    request({
      method: "POST",
      uri: apiEndpoint + "signin",
      body: {
        sessionId: this.state.sessionId,
        userId: this.state.myUsername,
        pin: this.state.pin
      },
      json: true // Automatically stringifies the body to JSON
    })
      .then(result => {
        //Industry standard is to convert this payload into a JWT token string via hashing
        //But we will simply stringify this, there are no sensitive data anyway.
        this.setState({ authorizationToken: JSON.stringify(result) });
        console.log(this.state.authorizationToken);
        this.subscribe();
      })
      .catch(err => {
        console.log(err);
        window.alert("Signin Failed");
      });
  }

  subscribe() {
    request({
      method: "POST",
      uri: apiEndpoint + "getapprovedquestions",
      headers: { Authorization: this.state.authorizationToken },
      body: {
        sessionId: this.state.sessionId
      },
      json: true // Automatically stringifies the body to JSON
    })
      .then(result => {
        client = new AWSMqttClient({
          region: AWS.config.region,
          credentials: AWS.config.credentials,
          endpoint: iotEndpoint,
          clientId: uuidv4()
        });

        client.on("connect", () => {
          logToPage("Successfully connected to AWS MQTT Broker!  :-)");
          client.subscribe(
            this.state.sessionId + "/clients",
            {},
            (err, granted) => {
              if (err) {
                logToPage(err);
              } else {
                granted.forEach(({ topic, qos }) => {
                  logToPage("Subscribed to: " + topic + " at Qos: " + qos);
                });
                client.subscribe(
                  this.sessionId + "/" + this.state.myUsername,
                  {},
                  (err, granted) => {
                    if (err) {
                      logToPage(err);
                    } else {
                      granted.forEach(({ topic, qos }) => {
                        logToPage(
                          "Subscribed to: " + topic + " at Qos: " + qos
                        );
                      });
                      this.setState({ joined: true });
                    }
                  }
                );
              }
            }
          );
        });

        client.on("message", this.handleMessage);

        client.on("close", () => {
          logToPage("Closed  :-(");
        });

        client.on("offline", () => {
          logToPage("Went offline  :-(");
        });

        this.addQuestions(result);
      })
      .catch(err => {
        console.log(err);
      });
  }

  sortQuestionOnTime(data) {
    let sorted = data.sort(function(a, b) {
      return b.updatedAt - a.updatedAt;
    });
    return sorted;
  }
  sortQuestionOnVote(data) {
    let sorted = data.sort(function(a, b) {
      return b.votes - a.votes;
    });
    return sorted;
  }

  addQuestions(qArr) {
    qArr.forEach(val => {
      questions[val.questionId] = val;
    });
    let sortedTime = this.sortQuestionOnTime(Object.values(questions));
    let sortedVote = this.sortQuestionOnVote([...sortedTime]);
    this.setState({
      questions: Object.values(sortedVote)
    });
  }

  removeQuestion(questionId) {
    delete questions[questionId];
    this.setState({
      questions: Object.values(questions)
    });
  }

  submit(question, anonymous) {
    request({
      method: "POST",
      uri: apiEndpoint + "submitquestion",
      headers: { Authorization: this.state.authorizationToken },
      body: {
        sessionId: this.state.sessionId,
        username: anonymous ? "anonymous" : this.state.myUsername,
        question: question
      },
      json: true // Automatically stringifies the body to JSON
    })
      .then(result => {})
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <div>
        <div>
          <Event
            display={this.state.joined ? "show" : "hide"}
            questions={this.state.questions}
            submit={this.submit}
            upvote={this.upvote}
            voted_list={this.state.voted_list}
            msg_sent={this.state.msg_sent}
            signout={this.signout}
          />
          <div className={this.state.joined ? "hide" : "show"}>
            <div className="head">
              <img src={logo} alt="Logo" id="logo" />
              <div className="title">CaTSH Partner Conference 2019</div>
            </div>
            <div className="bar">Welcome to our conference</div>
            <div id="login-form">
              <div className="group-form">
                <label id="email-label">Email: </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  onChange={e => this.setState({ myUsername: e.target.value })}
                />
              </div>

              <button
                type="button"
                id="login-btn"
                onClick={() => this.signin()}
              >
                Enter
              </button>
            </div>
          </div>
          <footer>
            <div className="copyright">© 2019 PwC. All rights reserved.</div>
            <img src={footer} alt="Footer" id="footer" />
            <img src={footer_app} alt="Footer app" id="footer_app" />
          </footer>
        </div>
      </div>
    );
  }
}

export default App;
