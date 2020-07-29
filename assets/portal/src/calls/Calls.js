import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { AuthAction } from "../store/actions/auth.actions";
import { TranscriptsAction } from "../store/actions/transcripts.actions";
import { SentimentAction } from "../store/actions/sentiment.action";
import requiresAuth from "../common/requiresAuth";
import NavigationBar from "../navigation/NavigationBar";
import {
  List,
  ListItem,
  Button,
  CircularProgress,
  Typography,
  withStyles,
  Grid
} from "@material-ui/core";
import CallCard from "./CallCard";

import { ApiService } from "../service/api.service";
const apiService = new ApiService();

const styles = theme => ({
  heading: {
    fontSize: theme.typography.pxToRem(20),
    padding: theme.spacing(1, 2)
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(20),
    color: theme.palette.text.secondary
  }
});

const initialState = {
  playing: false,
  showing: false,
  currentAudio: null,
  currentKey: null
};

class Calls extends Component {
  baseUrl = process.env.REACT_APP_BASE_API;
  constructor(props) {
    super(props);
    this.state = { ...initialState };
    this.togglePlay = this.togglePlay.bind(this);
    this.toggleTranscript = this.toggleTranscript.bind(this);
    this.nextPage = this.nextPage.bind(this);
  }

  componentDidMount() {
    this.props.getTranscripts();
  }

  togglePlay(event, uri) {
    event.stopPropagation();
    if (this.state.playing) this.setState({ ...this.state, playing: false });
    else
      apiService
        .getAuth()
        .then(token => {
          const options = {
            method: "GET",
            headers: {
              Authorization: `${token.accessToken}`
            },
            redirect: "follow" // manual, *follow, error
          };
          return fetch(
            `${this.baseUrl}/api/audio?uri=${encodeURIComponent(uri)}`,
            options
          );
        })
        .then(response => response.json())
        .then(response =>
          this.setState({
            playing: true,
            currentAudio: response.uri,
            currentKey: uri
          })
        );
  }

  toggleTranscript(event, transcriptUri, sentimentUri) {
    event.stopPropagation();

    if (this.state.showing) {
      this.setState({ ...this.state, currentKey: null, showing: false });
    } else {
      this.props.getSentiment(sentimentUri);
      this.setState({
        showing: true,
        currentKey: transcriptUri
      });
    }
  }

  nextPage() {
    if (this.props.transcript.lastEvaluatedKey) {
      this.props.getTranscripts(this.props.transcript.lastEvaluatedKey);
    }
  }

  render() {
    let { classes } = this.props;
    if (this.props.transcripts.loading) {
      return <CircularProgress />;
    }
    if (
      !this.props.transcripts.loading &&
      Object.keys(this.props.transcripts.data).length === 0
    ) {
      return (
        <div>
          <NavigationBar history={this.props.history} />
          <Grid container spacing={0} alignItems="center" justify="center">
            <div>
              <Typography className={classes.heading}>
                Welcome to the Intelligent Contact Center Post Call Analytics.
              </Typography>
              <Typography className={classes.heading}>
                Please upload some calls using the Upload button in the top
                right corner of the Navigation Bar.
              </Typography>
              <Typography className={classes.heading}>
                If you just uploaded, Please Refresh this page in a few minutes
                to view calls.
              </Typography>
            </div>
          </Grid>
        </div>
      );
    }
    if (
      !this.props.transcripts.loading &&
      Object.keys(this.props.transcripts.data).length !== 0
    ) {
      return (
        <div>
          <NavigationBar history={this.props.history} />
          <h1>Calls</h1>
          <List
            component="nav"
            aria-labelledby="nested-list-subheader"
            style={{ width: "100%" }}
          >
            {this.props.transcripts.data.map(transcript => (
              <ListItem key={transcript.audioURI} button={false}>
                <CallCard
                  transcript={{
                    ...transcript,
                    labels: this.props.transcripts.labels
                  }}
                  currentSentiment={this.props.sentiment.data}
                  {...this.state}
                  togglePlay={this.togglePlay}
                  toggleTranscript={this.toggleTranscript}
                />
              </ListItem>
            ))}
          </List>
          {this.state.playing && (
            <audio src={this.state.currentAudio} autoPlay></audio>
          )}
          <Button
            style={{ marginLeft: 16 }}
            variant="contained"
            disabled={this.props.transcripts.lastEvaluatedKey === null}
            onClick={this.nextPage}
          >
            Next Page
          </Button>
        </div>
      );
    }
  }
}

Calls.propTypes = {
  logout: PropTypes.func,
  showGlobalSettingsModal: PropTypes.bool
};

const mapStateToProps = state => {
  return {
    transcripts: state.transcripts,
    sentiment: state.sentiment
  };
};

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(AuthAction.logout()),
    getTranscripts: lastEvaluatedKey =>
      dispatch(TranscriptsAction.getTranscripts(lastEvaluatedKey)),
    getSentiment: uri => dispatch(SentimentAction.getSentiment(uri))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(requiresAuth(Calls)));
