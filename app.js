const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');

const key = process.env.GOOGLE_API_KEY || fs.readFileSync('./secret', 'utf8');

http.createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

    if (request.method === 'POST') {
        let bodyJson = '';

        request.on('data', (chunk) => {
            bodyJson += chunk;
        }).on('end', () => {
            
            if(!bodyJson) {
                response.statusCode = 400;
                response.end();
            }

            try {
                const body = JSON.parse(bodyJson);
                onHttpPost(body)
                    .then(videoIds => { 
                        response.setHeader('Content-Type', 'application/json');
                        response.end(JSON.stringify(videoIds));
                    });
            } catch(err) {
                response.statusCode = 500;
                response.end(err);
            }
        });
    } else if(request.method === 'GET') {
        res.writeHead(200)
        response.end('Hi!');
    } else  if ( req.method === 'OPTIONS' ) {
		res.writeHead(200);
		res.end();
	}
}).listen(process.env.PORT || 8098);

function onHttpPost(body) {
    return new Promise((res, rej) => {
        const base64Image = body.base64Image;

        if(!base64Image) {
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