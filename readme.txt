This is a final project submission for USC EE547 - Applied and Cloud Computing



Our project is to build a platform that will fetch, make predictions on, and 
display data related to MLB teams.  Users will be able to see some data without 
being logged in. However, upon account creation, they will be able to see 
predictions and select a favorite team, which will become the default for that
user once logged in.  From there, account users will be able to navigate through 
each team to display the team's record, roster, statistics and, most notably, 
updated playoff predictions from an ML model, learned on various statistics from 
the past 10 years of baseball data. 


The project is built using Express, Vue, puppetteer, HTML, CSS, javascript and Axios


To run this application, clone the repository and then:

1. run $ npm install
2. install mongoDB (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/#install-mongodb-community-edition)
3. run a mongoDB container
4. run $ nodemon user.js
5. go to {IP ADDR}:3000/index.html
