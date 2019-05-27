import React, { Component } from "react";

//MQTT (AWS IOT)
import uuidv4 from "uuid/v4";
import AWS from "aws-sdk/global";
import AWSMqttClient from "aws-mqtt";

//HTTP Requests
import request from "request-promise-native";

import pwc_logo from "./images/logo.png";
import DisplayPosts from "./components/DisplayPosts";

import "./App.css";

// import { Votes, ActionMenu } from "./QuestionComponents.js";

//Environment Configs
import { IdentityPoolId, apiEndpoint, iotEndpoint, region } from "./configs.js";
AWS.config.region = region;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: IdentityPoolId
});

//Connect to AWS IOT
const client = new AWSMqttClient({
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: iotEndpoint,
  clientId: uuidv4()
});

client.on("connect", () => {
  logToPage("Successfully connected to AWS MQTT Broker!  :-)");
});

client.on("close", () => {
  logToPage("Closed  :-(");
});

client.on("offline", () => {
  logToPage("Went offline  :-(");
});

var logger;
function logToPage(data) {
  if (logger !== undefined) {
    logger(data);
  } else {
    console.log(data);
  }
}

const questions = {};

function updateQuestion(path, questionId) {
  request({
    method: "POST",
    uri: apiEndpoint + path,
    body: {
      sessionId: this.state.sessionId,
      questionId: questionId
    },
    json: true // Automatically stringifies the body to JSON
  })
    .then(result => {
      logToPage(path + " " + questionId + " Success");
    })
    .catch(err => {
      logToPage(err);
    });
}

const statusFilter = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  deleted: "Deleted"
};

class App extends Component {
  constructor(props) {
    super(props);
    this.logToPage = this.logToPage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.upsertQuestions = this.upsertQuestions.bind(this);
    logger = this.logToPage;
    this.logs = [];
    this.state = {
      status: "pending",
      questions: [],
      logs: "",
      sessionId: "2",
      joined: false
    };
  }

  logToPage(str) {
    this.logs.unshift(str);
    this.setState({
      logs: this.logs.join("\n")
    });
  }

  componentDidMount() {
    client.on("message", this.handleMessage);
    this.subscribe();
  }

  handleMessage(topic, message) {
    const m = JSON.parse(String(message));
    switch (m.path) {
      case "submitquestion":
      case "approvequestion":
      case "rejectquestion":
      case "publishquestion":
      case "deletequestion":
        this.upsertQuestions([m.data]);
        break;
      default:
        break;
    }
  }

  componentWillUnmount() {
    client.end();
  }

  subscribe() {
    console.log("subscribed");
    request({
      method: "POST",
      uri: apiEndpoint + "getallquestions",
      body: {
        sessionId: this.state.sessionId
      },
      json: true // Automatically stringifies the body to JSON
    })
      .then(result => {
        client.subscribe(
          this.state.sessionId + "/moderator",
          {},
          (err, granted) => {
            if (err) {
              logToPage(err);
            } else {
              granted.forEach(({ topic, qos }) => {
                logToPage("Subscribed to: " + topic + " at Qos: " + qos);
              });
              client.subscribe(
                this.state.sessionId + "/clients",
                (err, granted) => {
                  if (err) {
                    logToPage(err);
                  } else {
                    granted.forEach(({ topic, qos }) => {
                      logToPage("Subscribed to: " + topic + " at Qos: " + qos);
                    });
                    this.upsertQuestions(result);
                    this.setState({ joined: true });
                  }
                }
              );
            }
          }
        );
      })
      .catch(err => {
        console.log(err);
      });
  }

  upsertQuestions(qArr) {
    qArr.forEach(val => {
      questions[val.questionId] = val;
    });
    this.setState({
      questions: Object.values(questions)
    });
  }

  render() {
    return (
      <div className="moderator-dashboard">
        <header>
          <img src={pwc_logo} alt="Pwc Logo" />
          <div className="vertical-bar" />
          <div className="heading-title">CaTSH Partner Conference 2019</div>
        </header>
        <div className="content">
          <div className="left-box" />
          <div className="right-box">
            <div className="right-box-static-content">Total</div>
            <DisplayPosts
              questions={this.state.questions}
              status={this.state.status}
            />
          </div>
        </div>
      </div>
    );
  }

  renderQuestions() {
    if (this.state.joined) {
      return <div />;
    }
  }

  renderFilterButtons() {
    return Object.entries(statusFilter).map(([key, value]) => {
      const color = this.state.filter === value ? "primary" : "secondary";
      return <button />;
    });
  }
}

export default App;
