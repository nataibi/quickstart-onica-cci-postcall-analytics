# AWS ICC Portal
---
### To run locally
 - Create an App client with no secret key
 - Under `App client settings`, check the `Cognito User Pool` box and add `Authorization code grant`, `openid`, and `profile` to the flows/scopes
 - Add `localhost:3000/login` to both Callback and Signout URL
 - Copy `.env` to `.env.local`
 - Change `REACT_APP_BASE_API` to your API Gateway root Invoke URL (Find on Stages tab)
 - Change all Cognito variables to your User Pool Ids and App
 - Create a user
 - Run `npm start`
 - Go to `http://localhost:3000` and login with the user you created
 - Upload some audio files to see content