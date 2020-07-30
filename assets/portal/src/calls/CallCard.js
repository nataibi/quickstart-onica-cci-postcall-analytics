import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import IconButton from '@material-ui/core/IconButton'
import Typography from '@material-ui/core/Typography'
import PlayArrowIcon from '@material-ui/icons/PlayCircleFilled'
import PauseIcon from '@material-ui/icons/PauseCircleFilled'

import ExpansionPanel from '@material-ui/core/ExpansionPanel'
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails'
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import Divider from '@material-ui/core/Divider'
import Grid from '@material-ui/core/Grid'
import CircularProgress from '@material-ui/core/CircularProgress'
import SentimentVerySatisfiedIcon from '@material-ui/icons/SentimentVerySatisfied'
import SentimentSatisfiedIcon from '@material-ui/icons/SentimentSatisfied'
import SentimentVeryDissatisfiedIcon from '@material-ui/icons/SentimentVeryDissatisfied'
import Chip from '@material-ui/core/Chip'

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
  },
  chips: {
    marginRight: 5
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  icon: {
    verticalAlign: 'bottom',
    height: 20,
    width: 20,
  },
  details: {
    alignItems: 'center',
  },
  column: {
    flexBasis: '33.33%',
  },
  helper: {
    borderLeft: `2px solid ${theme.palette.divider}`,
    padding: theme.spacing(1, 2),
  },
  link: {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  }
}));

function TranscriptLine(props) {
  const classes = props.classes
  if (!props.turn) return null
  return (
    <Grid container item xs={12}>
      <Grid item xs={10}>
        <Grid item xs={10}>
          {Emoji[props.turn.sentiment.Sentiment]}
          <Typography style={{ fontWeight: 'bold' }} className={classes.heading} component="span">{props.turn.speaker === AGENT ? 'Agent ' : 'Customer '}</Typography>
          <Typography style={{ color: '#4186b2' }} className={classes.secondaryHeading} component="span">
            {props.turn.start_time}
          </Typography>
        </Grid>
        <Grid item xs={10}>{props.turn.text}</Grid>
      </Grid>
    </Grid>)
}

const Emoji = {
  'NEGATIVE': <SentimentVeryDissatisfiedIcon style={{ color: "#ff9495" }} />,
  'POSITIVE': <SentimentVerySatisfiedIcon style={{ color: "#6cd3aa" }} />,
  'NEUTRAL': <SentimentSatisfiedIcon style={{ color: "#d5d5d5" }} />
}

const AGENT = 'AGENT'
const CUSTOMER = 'CUSTOMER'

const getSpeaker = (turn) => turn.hasOwnProperty('channel') ? turn.channel : turn.speaker_label

function getTranscriptTurns(transcript) {
  const agentOrder = parseInt(transcript.sentiment.turns.numChannels === 2 ? transcript.labels.agentChannel : transcript.labels.agentLabel)
  console.log(agentOrder)
  const customerOrder = agentOrder === 0 ? 1 : 0

  transcript.sentiment.turns.filter(t => getSpeaker(t) === customerOrder).map( t => t.speaker =  CUSTOMER)
  transcript.sentiment.turns.filter(t => getSpeaker(t) === agentOrder).map( t => t.speaker =  AGENT)
  
  console.log(transcript.sentiment.turns)
  
  return transcript.sentiment.turns
}

const getCategories = (sentiment) => ([
  (sentiment || {}).call_motivation_status,
  (sentiment || {}).call_resolution_status
])

export default function CallCard(props) {
  const classes = useStyles();
  const playing = props.playing && props.transcript.audioURI === props.currentKey
  const [callMotivation, callResolution] = getCategories(props.currentSentiment)
  const expanded = (props.showing && props.currentKey === props.transcript.fullTranscriptURI) || (props.showing && props.currentKey === props.transcript.audioURI)
  return (
    <div className={classes.root}>
      <ExpansionPanel
        expanded={expanded}
        onClick={(e) => props.toggleTranscript(e, props.transcript.fullTranscriptURI, props.transcript.analysisURI)}
        onFocus={event => event.stopPropagation()}
      >
        <ExpansionPanelSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1c-content"
          id="panel1c-header" >
          <div className={classes.column}>
            <Typography className={classes.heading}>Contact Summary</Typography>
            <Typography className={classes.secondaryHeading}>Uploaded: {props.transcript.user}</Typography>
            <Typography className={classes.secondaryHeading}>Last Modified: {props.transcript.lastModified}</Typography>
          </div>
          <div className={classes.column} style={{ margin: 'auto 0' }}>
            <IconButton aria-label="play/pause" onClick={(e) => props.togglePlay(e, props.transcript.audioURI)} onFocus={event => event.stopPropagation()}>
              {!playing && <PlayArrowIcon className={classes.playIcon} />}
              {playing && <PauseIcon className={classes.playIcon} />}
            </IconButton>
            <Typography className={classes.secondaryHeading}>{props.transcript.transcriptionJobName}</Typography>
          </div>
        </ExpansionPanelSummary>
        <Divider />
        <ExpansionPanelDetails className={classes.details}>
          {props.currentSentiment && expanded
          ? <div className={classes.root}>
              <Grid container spacing={1}>
                <Grid item xs={12} style={{ paddingBottom: '.5em' }}>
                  <Typography style={{ fontWeight: 'bold' }} className={classes.secondaryHeading} component="span">Categories</Typography>
                </Grid>
                <Grid container item xs={12} style={{ paddingBottom: '.5em' }} >
                    {callMotivation && <Chip className={classes.chips} label={callMotivation} color="primary" />}
                    {callResolution && <Chip className={classes.chips} label={callResolution} color="primary" />}
                </Grid>
                <Grid item xs={12}>
                  <Typography style={{ fontWeight: 'bold' }} className={classes.secondaryHeading} component="span">Transcript</Typography>
                </Grid>
                {getTranscriptTurns({ labels: props.transcript.labels, sentiment: props.currentSentiment }).map((turn, i) => (
                  <TranscriptLine
                    key={"transcript-line-" + i}
                    turn={turn} classes={classes}
                  />
                ))}
              </Grid>
            </div>
          : <CircularProgress/>}
        </ExpansionPanelDetails>
      </ExpansionPanel>
    </div>
  )
}
