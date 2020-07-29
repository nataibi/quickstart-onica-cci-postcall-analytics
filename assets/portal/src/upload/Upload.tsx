import * as React from "react"
import { CardContent, Typography, CardActions, Button, Paper, Card, makeStyles, Container, Grid, Chip, Avatar, CircularProgress } from "@material-ui/core"
import CloudUploadIcon from '@material-ui/icons/CloudUpload'
import SaveIcon from '@material-ui/icons/Save'
import Dropzone, { DropEvent } from 'react-dropzone'
import { v4 } from 'uuid'
import {ApiService} from "../service/api.service"
import AuthDto from "../dto/auth.dto"
import NavigationBar from "../navigation/NavigationBar"
import moment from 'moment'
import {connect} from 'react-redux'
import {withStyles} from "@material-ui/core"
import requiresAuth from "../common/requiresAuth"

const apiService = new ApiService()

const styles = () => ({
})

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
  paper: {
    padding: 2,
    textAlign: 'center',
  }
})

interface FileWithPath extends File {
  path: string;
}

type Upload = {
  history: any;
  token: any;
  refreshToken: () => Promise<any>;
  updateToken: (token: any) => void;
}

type FileData = {
  data: string | ArrayBuffer | null;
  contentType: string;
  name: string;
  lastModified: string;
}

type UploadState = {
  status: string | null;
  files: FileWithPath[];
}

type UploadAction = {
  type: string;
  payload?: any;
}

type UploadCases = {
  [a: string]: (b: UploadState, c: any) => UploadState
}

export const readFile = async (file: File): Promise<FileData> => new Promise((res, rej) => {
  const reader = new FileReader()
  reader.onabort = () => rej('File read aborted')
  reader.onerror = (e) => rej(e)
  reader.onloadend = () => res({
    data: reader.result,
    contentType: file.type,
    name: file.name.replace(/ /g,"_"),
    lastModified: moment.utc(new Date(file.lastModified)).toISOString()
  })
  reader.readAsArrayBuffer(file)
})

const Upload = (props: Upload) => {
  const FILE_DROPPED = 'FILE_DROPPED'
  const FILE_REMOVED = 'FILE_REMOVED'
  const CLEAR_FILES = 'CLEAR_FILES'
  const PENDING = 'PENDING'
  const SUCCESS = 'SUCCESS'
  const FAIL = 'FAIL'

  const initialState: UploadState = {
    status: null,
    files: []
  }
  const classes = useStyles()

  const cases: UploadCases = {
    [FILE_DROPPED]: (state: UploadState, payload): UploadState => ({
      status: null,
      files: state.files.concat(payload)
    }),
    [FILE_REMOVED]: (state: UploadState, payload): UploadState => ({
      status: null,
      files: state.files.filter(f => f.path !== payload)
    }),
    [CLEAR_FILES]: (): UploadState => initialState,
    [PENDING]: (state: UploadState) => ({
      ...state,
      status: PENDING,
    }),
    [SUCCESS]: (): UploadState => ({
      ...initialState,
      status: SUCCESS
    }),
    [FAIL]: (state: UploadState): UploadState => ({
      ...state,
      status: FAIL
    })
  }

  const reducer = (state: UploadState, action: UploadAction): UploadState => cases[action.type] ? cases[action.type](state, action.payload) : state
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const filesDropped = (accepted: File[], rejected: File[], event: DropEvent) => dispatch({
    type: FILE_DROPPED,
    payload: accepted
  })
  const removeFile = (path: string) => dispatch({ type: FILE_REMOVED, payload: path })
  const clearFiles = () => dispatch({ type: CLEAR_FILES })
  console.log(`Stage: ${process.env.STAGE}`)

  const getToken = async (): Promise<AuthDto> => {
    const token = await apiService.getAuth()
    if (!token) throw Error('No token found')
    return token
  }

  const authenticatedUpload = async () => {
    const files: FileData[] = await Promise.all(state.files.map((file: File) => readFile(file)))
    if (!files) throw Error('No files to upload')
    let token = await getToken()
    const response = await fetch(`${process.env.REACT_APP_BASE_API}/api/presigned`, {
      method: 'POST',
      headers: {
        Authorization: `${token.accessToken}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *client
      body: JSON.stringify({
        files: files.map(file => ({ name: file.name.replace(/ /g,"_"), type: file.contentType , lastModified: file.lastModified, jobId: v4() }))
      })
    })
    if (!response.ok) throw Error(response.statusText)

    const body = await response.json()
    console.log(body)

    token = await getToken()
    // update status in dynamodb
    await fetch(`${process.env.REACT_APP_BASE_API}/api/status`, {
      method: 'POST',
      headers: {
        Authorization: `${token.accessToken}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *client
      body: JSON.stringify({
        uris: body.map((s: any) => ({
          uri: `s3://${s.Bucket}/${s.Key}`,
          lastModified: s.lastModified,
          jobId: s.jobId
        }))
      })
    })

    // use array of presigned urls to upload
    const s3Response: Response[] = await Promise.all(body.map((response: any) => {
      const file = files.find(file => file.name.replace(/ /g,"_") === response.name)
      if (!file) throw Error('No file found for name ' + response.name)
      return fetch(response.url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.contentType
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *client
        body: file.data
      })
    }))
    console.log(s3Response)

  }

  const upload = () => {
    dispatch({ type: PENDING })

    authenticatedUpload()
    .then(() => {
      dispatch({ type: SUCCESS })
    })
    .catch(e => {
      console.log(e)
      dispatch({ type: FAIL })
    })
  }

  return (
    <div>
      <NavigationBar { ...props } />
      <Paper>
        <Card className={classes.root}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom className={classes.title}>
              Upload Files
            </Typography>
            <Grid
              container
              spacing={3}>
              <Grid item xs={12}>
                  <Paper variant="outlined" className={classes.paper}>
                    <Dropzone onDrop={filesDropped}>
                      {({getRootProps, getInputProps}) =>
                        <div style={{height: '30vh'}} {...getRootProps()}>
                          <input {...getInputProps()} />
                          <Typography className={classes.title} >
                            Drag and drop files here
                          </Typography>
                        </div>}
                    </Dropzone>
                  </Paper>
              </Grid>
            </Grid>
            <Container>
              {state.files.map(f => <Chip
                key={f.path}
                avatar={<Avatar alt="File"><SaveIcon /></Avatar>}
                label={f.path}
                onDelete={() => removeFile(f.path)}
              />)}
            </Container>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              color="default"
              size="small"
              onClick={clearFiles}>
                Clear
            </Button>
            <Button
              disabled={state.status === PENDING}
              variant="contained"
              color="primary"
              startIcon={<CloudUploadIcon/>}
              onClick={upload}>
              Upload
            </Button>
            {state.status === FAIL && <Typography color="textSecondary">Upload Failed. Try Logging In.</Typography>}
            {state.status === PENDING && <CircularProgress />}
            {state.status === SUCCESS && <Typography color="textSecondary">Upload Successful</Typography>}
          </CardActions>
        </Card>
      </Paper>
    </div>)
}

const mapStateToProps = () => {
  return {}
}

const mapDispatchToProps = () => {
  return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(requiresAuth(Upload)))
