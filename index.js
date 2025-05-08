// const express = require('express');
// const cors = require('cors');
// const ytdl = require('ytdl-core');
// const app = express();
// const PORT = process.env.SERVER_PORT || 8000
// const { testSpeedHandler } = require( './api-handlers' )

// require('dotenv').config();
// const corsOptions = {
//     origin: '*',
//     optionsSuccessStatus: 200,
// }
// app.use(cors(corsOptions));
// app.use(express.json());


// app.post('/api/video-info', async (req, res) => {
//     try {
//       const { url } = req.body;

//       // Validate URL
//       if (!ytdl.validateURL(url)) {
//         return res.status(400).json({ error: 'Invalid YouTube URL' });
//       }

//       // Get video info
//       const info = await ytdl.getInfo(url);

//       // Format the response
//       const videoDetails = {
//         title: info.videoDetails.title,
//         thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
//         duration: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
//         formats: []
//       };

//       // Get available formats
//       const formats = info.formats.filter(format => {
//         return format.hasVideo && format.hasAudio && format.container === 'mp4';
//       });

//       // Add video formats
//       const qualitySet = new Set(); // To avoid duplicate qualities
//       formats.forEach(format => {
//         if (format.qualityLabel && !qualitySet.has(format.qualityLabel)) {
//           qualitySet.add(format.qualityLabel);
//           videoDetails.formats.push({
//             quality: format.qualityLabel,
//             format: 'mp4',
//             size: formatSize(format.contentLength),
//             id: format.itag
//           });
//         }
//       });

//       // Sort by quality (highest first)
//       videoDetails.formats.sort((a, b) => {
//         const aRes = parseInt(a.quality.replace('p', ''));
//         const bRes = parseInt(b.quality.replace('p', ''));
//         return bRes - aRes;
//       });

//       // Add audio option
//       const audioFormat = info.formats.find(f => f.mimeType?.includes('audio/mp4') && !f.hasVideo);
//       if (audioFormat) {
//         videoDetails.formats.push({
//           quality: 'Audio',
//           format: 'mp3',
//           size: formatSize(audioFormat.contentLength),
//           id: 'audio'
//         });
//       }

//       return res.status(200).json(videoDetails);
//     } catch (error) {
//       console.error(error);
//       return res.status(500).json({ error: 'Failed to get video information' });
//     }
//   });

//   // API endpoint to handle downloads
//   app.get('/api/download', async (req, res) => {
//     try {
//       const { url, format } = req.query;

//       if (!ytdl.validateURL(url)) {
//         return res.status(400).send('Invalid YouTube URL');
//       }

//       const info = await ytdl.getInfo(url);

//       if (format === 'audio') {
//         // Set headers for audio download
//         res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp3"`);
//         res.header('Content-Type', 'audio/mpeg');

//         // Download audio only
//         ytdl(url, { 
//           quality: 'highestaudio',
//           filter: 'audioonly' 
//         }).pipe(res);
//       } else {
//         // Set headers for video download
//         res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
//         res.header('Content-Type', 'video/mp4');

//         // Download video with specific format (itag)
//         ytdl(url, { 
//           quality: format,
//           filter: format => format.itag == parseInt(format)
//         }).pipe(res);
//       }
//     } catch (error) {
//       console.error(error);
//       res.status(500).send('Download failed');
//     }
//   });

//   // Helper functions
//   function formatDuration(seconds) {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
//   }

//   function formatSize(bytes) {
//     if (!bytes) return 'Unknown';
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(1024));
//     return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
//   }




// app.get("/", async ( req, res ) => { 

//     const speedTestData = await testSpeedHandler()
//     res.status( speedTestData.status )
//     res.send( speedTestData.data )    
// });

// app.listen( PORT, () => {

//     console.log( `Listening on port ${ PORT }` );
// });



const express = require('express');
const cors = require('cors');
const youtubeDl = require('youtube-dl-exec');
const app = express();
const PORT = process.env.SERVER_PORT || 8000;
const { testSpeedHandler } = require('./api-handlers');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';

require('dotenv').config();
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());

const cookiesPath = path.join(__dirname, '../cookies.txt');
// Create temp directory for downloads if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Helper to clean filename
function sanitizeFilename(filename) {
  return filename.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_');
}


app.post('/api/video-info', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Use the youtubeDl package instead of exec command
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      cookies: cookiesPath
    };

    const videoData = await youtubeDl(url, options);
    
    try {
      // Format handling - same logic as before
      const formats = videoData.formats
        .filter(format => format.resolution !== 'audio only' || format.ext === 'mp3' || format.ext === 'm4a')
        .map(format => {
          let quality = format.resolution || 'Audio';
          if (format.resolution === 'audio only') {
            quality = `Audio ${format.ext.toUpperCase()}`;
          }
          
          return {
            id: format.format_id,
            quality: quality,
            format: format.ext,
            size: format.filesize ? `${(format.filesize / 1048576).toFixed(1)} MB` : 'Unknown size',
          };
        });
      
      // Remove duplicates
      const uniqueFormats = [];
      const seen = new Set();
      
      formats.forEach(format => {
        const key = `${format.quality}-${format.format}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFormats.push(format);
        }
      });
      
      res.json({
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        duration: formatDuration(videoData.duration),
        formats: uniqueFormats.slice(0, 6) 
      });
    } catch (parseError) {
      console.error('Failed to parse video information:', parseError);
      res.status(500).json({ error: 'Failed to parse video information' });
    }
  } catch (err) {
    console.error('Youtube-dl error:', err);
    res.status(500).json({ 
      error: 'Failed to get video information',
      message: err.message || err.stderr || 'Unknown error'
    });
  }
});

// And update the /api/download route:

app.get('/api/download', async (req, res) => {
  const { url, format } = req.query;
  
  if (!url || !format) {
    return res.status(400).json({ error: 'URL and format are required' });
  }

  try {
    // Temporary file for download
    const fileExtension = format.includes('audio') ? 'mp3' : 'mp4';
    const tempFile = path.join(__dirname, '../temp', `download-${Date.now()}.${fileExtension}`);
    const downloadDir = path.dirname(tempFile);
    
    // Make sure temp directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Use youtubeDl package instead of exec
    const options = {
      output: tempFile,
      format: format,
      cookies: cookiesPath
    };

    try {
      await youtubeDl(url, options);
      
      // Send file and delete after download
      res.download(tempFile, (err) => {
        if (err) {
          console.error('File download error:', err);
        }
        
        // Delete temp file after download
        try {
          fs.unlinkSync(tempFile);
        } catch (unlinkErr) {
          console.error('Failed to delete temp file:', unlinkErr);
        }
      });
    } catch (dlErr) {
      console.error('Download error:', dlErr);
      return res.status(500).json({ 
        error: 'Download failed', 
        message: dlErr.message || dlErr.stderr || 'Unknown error'
      });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper functions
function formatDuration(seconds) {
  if (!seconds) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Root endpoint for testing
app.get("/", async (req, res) => {
  res.status(200);
  res.send({ statu: 'ok' });
});

app.get("/speedtest", async (req, res) => {
  const speedTestData = await testSpeedHandler();
  res.status(speedTestData.status);
  res.send(speedTestData.data);
});

app.listen(PORT, () => {
  console.log(`YouTube Downloader API listening on port ${PORT}`);
});