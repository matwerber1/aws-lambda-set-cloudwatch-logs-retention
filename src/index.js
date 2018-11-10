const AWS            = require('aws-sdk');
const cloudwatchlogs = new AWS.CloudWatchLogs();

const config = {
  debug:          false,                  // if true, print additional info to logs
  defaultRetentionDays: 14                // allowed values are [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653]
};

//##############################################################################
exports.handler = async (event, context) => {

  // Normally, will only add a retention policy to log groups that do not already have a policy. 
  // However, if received event contains { overridePolicies: true }, then all log groups will be updated with the new default value. 

  try {
    
    let logGroups = await getLogGroups();
    
    console.log(`${logGroups.length} log groups currently consume (${logGroups.storedMegabytes.toLocaleString()} MB of storage).`);
  
    for (const logGroup of logGroups) {
  
      if(logGroup.retentionInDays === undefined || (event.overridePolicies === true && logGroup.retentionInDays !== config.defaultRetentionDays)) {
  
        await PutLogGroupRetentionPolicy(logGroup.logGroupName, config.defaultRetentionDays);
  
        if (event.overridePolicies === true) {
          console.log(`${logGroup.logGroupName} policy overriden to ${config.defaultRetentionDays} day policy.`);
        } else {
          console.log(`${logGroup.logGroupName} had no pre-existing retention policy; successfully added new ${config.defaultRetentionDays} day policy.`);
        }
      }
    }
  } 

  catch (err) {
    console.log('>>>>>>ERROR>>>>>>>\n' + err);
  }
};

//##############################################################################
async function getLogGroups() {
  
  let params    = {};
  let logGroups = [];
  
  logGroups.storedBytes = 0;  // informational
  
  do {
    
    debugMessage(`Calling cloudwatchlogs.describeLogGroups(${JSON.stringify(params)})`);
    let response = await cloudwatchlogs.describeLogGroups(params).promise();
    
    for (const logGroup of response.logGroups) {
      logGroups.push(logGroup);
      logGroups.storedBytes += logGroup.storedBytes;
    }
    
    params.NextToken = response.NextToken || undefined;
    
  } while (params.NextToken !== undefined);
  
  // just for informational purposes, show the size of the storage for each group. 
  logGroups.storedMegabytes = logGroups.storedBytes / 1000000;
  return logGroups;
}
//##############################################################################
async function PutLogGroupRetentionPolicy(logGroupName, retentionInDays) {

  let params = {
    logGroupName: logGroupName,
    retentionInDays: retentionInDays
  };
  
  debugMessage(`Calling cloudwatchlogs.describeLogGroups(${JSON.stringify(params)})`);
  await cloudwatchlogs.putRetentionPolicy(params).promise();

}

//##############################################################################
function debugMessage(message) {
  // message = string
  if (config.debug) {
    console.log(message);
  }
}