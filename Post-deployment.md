# quickstart-onica-cci-postcall-analytics

## Contact Center Intelligence - Post-call analytics on AWS

### Post-deployment steps

After the stack creation has completed successfully, and portal website is available at CloudFront distribution endpoint, follow the below steps to upload the call recording and view the insights.

#### Create user to login
1. Create a User in Cognito under the *UserPool* Created by the stack. Visit this [how-to](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html) guide to learn how to create a user in a Cognito pool if you’re not familiar with it. By default, usernames in this application must be full email addresses, and passwords must contain one of each of numeric, upper-case, lower-case and special characters; these restraints can be changed within the Cognito console.

2. If you are logged into your AWS account in a browser window already, open the portal endpoint in a different *Incognito Window* as the portal attaches a QuickSight User Role that can interfere with your actual role.

3. Go to the portal and login with the created user.  Upon initial login, you will be prompted to change the temporary password. After you’ve successfully changed the password, you will be directed to the main page where you can see the home page.

![Portal main page](./images/portal-main.png)

#### Upload call recordings
1. Click on the *Upload* button located in the upper right corner of the navigation bar
2. You will be taken to a page where you can upload audio files. 
3. Click *Upload*. 
4. After a successful upload of the audio files the audio processing will run through transcription and text analysis.
5. Click on the Call Analytics Logo in the top left of the Navigation Bar to return to home page.

![Portal with calls](./images/portal-with-calls.png)

6. Drill down into a call to see Amazon Comprehend’s result of the call classifications and turn-by-turn sentiments.
7.	Click on the the PLAY icon on each call to playback the original audio file.  Note, not all browsers will be able to playback all file formats that this solution can process; this is due to playback being implemented via the HTML5 <audio> control, and format support is browser-specific.

