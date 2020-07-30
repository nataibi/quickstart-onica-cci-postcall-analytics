import {combineReducers} from "redux";

import authReducer from './reducers/auth.reducer';
import transcriptsReducer from './reducers/transcripts.reducer'
import sentimentReducer from './reducers/sentiment.reducer'

const rootReducer = combineReducers({
    auth: authReducer,
    transcripts: transcriptsReducer,
    sentiment: sentimentReducer
});

export default rootReducer;