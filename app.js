var express = require('express')
var cors = require('cors')
var app = express();
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');


const key = process.env.GOOGLE_API_KEY || fs.readFileSync('./secret', 'utf8');

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hi!');
})

app.post('/', (req, res) => {
    try {
        onHttpPost(req.body)
            .then(videoIds => {
                res.send(videoIds);
            });
    } catch (err) {
        res.status(500).send('Something broke!');
    }
});

app.listen(process.env.PORT || 8098, function () {
    console.log('CORS-enabled, web server listening.')
});

function onHttpPost(body) {
    return new Promise((res, rej) => {
        const base64Image = body.base64Image;

        if (!base64Image) {
            rej('Image not provided.');
            return;
        }

        findDescriptionByPicture(base64Image)
            .then(searchText => {
                searchVideos(searchText)
                    .then(videoIds => {
                        res(videoIds);
                    }, () => {
                        rej('Internal Server Error');
                    });
            }, () => {
                rej('Internal Server Error');
            });
    });
}

function findDescriptionByPicture(base64Image) {
    const body = {
        requests: [
            {
                image: {
                    content: base64Image
                },
                features: [
                    {
                        type: 'WEB_DETECTION'
                    }
                ]
            }
        ]
    };

    return fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, { method: 'POST', body: JSON.stringify(body) })
        .then(res => res.json())
        .then(json => {
            const webEntities = json.responses[0].webDetection.webEntities;
            return webEntities && webEntities[0] && webEntities[0].description;
        });
}

function searchVideos(searchText) { //return array with video ids 
    return fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchText}&key=${key}`)
        .then(res => res.json())
        .then(json => {
            return json.items.map(v => v.id.videoId);
        });
}