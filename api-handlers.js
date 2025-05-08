// const { getExecOutput } = require( './api-handlers-helpers' );
// var os = require('os');

// exports.testSpeedHandler = async() => {

//     const testCommandOutput = await getExecOutput( 'fast --upload --json' )

//     //Handle no internet error
//     if ( testCommandOutput.data == '› Please check your internet connection\n\n\n' ) 
//     {    
//         testCommandOutput.status = 400
//     }

//     if ( testCommandOutput.status !== 200 ) 
//     {    
//         return testCommandOutput
//     }

//     return {
//         ...testCommandOutput,
//         data: {
//             ...JSON.parse( testCommandOutput.data ),
//             server: os.hostname(),
//             os: process.platform,
//         }
//     }
// }


const { getExecOutput } = require('./api-handlers-helpers');
const os = require('os');

exports.testSpeedHandler = async() => {
    try {
        // Check if fast-cli is installed
        const checkInstall = await getExecOutput('which fast || echo "not installed"');
        
        // If fast-cli is not installed, return a helpful error
        if (checkInstall.data.includes("not installed")) {
            return {
                status: 500,
                data: {
                    error: "Fast CLI tool is not installed on this server",
                    message: "Please run 'npm install -g fast-cli' on the server"
                }
            };
        }
        
        // Execute the speed test command
        const testCommandOutput = await getExecOutput('fast --upload --json');

        // Handle no internet error
        if (testCommandOutput.data === '› Please check your internet connection\n\n\n') {
            return {
                status: 400,
                data: {
                    error: "Internet connection issue",
                    message: "Please check your internet connection and try again"
                }
            };
        }

        if (testCommandOutput.status !== 200) {
            return testCommandOutput;
        }

        let speedData;
        try {
            speedData = JSON.parse(testCommandOutput.data);
        } catch (e) {
            return {
                status: 400,
                data: {
                    error: "Invalid response from speed test",
                    message: "Could not parse speed test results",
                    raw: testCommandOutput.data
                }
            };
        }

        return {
            status: 200,
            data: {
                ...speedData,
                server: os.hostname(),
                os: process.platform,
            }
        };
    } catch (error) {
        return {
            status: 500,
            data: {
                error: "Speed test failed",
                message: error.message || "Unknown error occurred",
                details: error
            }
        };
    }
}