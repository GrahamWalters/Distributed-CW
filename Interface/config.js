module.exports = {
    'secret': '',
    'expiresIn': 60*15,
    'services': {
        's3':     'http://'+process.env.S3_PORT_3002_TCP_ADDR+':'+
                            process.env.S3_PORT_3002_TCP_PORT,
        'azure':  'http://'+process.env.AZURE_PORT_3002_TCP_ADDR+':'+
                            process.env.AZURE_PORT_3002_TCP_PORT,
        'google': 'http://'+process.env.GOOGLE_PORT_3002_TCP_ADDR+':'+
                            process.env.GOOGLE_PORT_3002_TCP_PORT,
        'engine': 'http://'+process.env.ENGINE_PORT_9000_TCP_ADDR+':'+
                            process.env.ENGINE_PORT_9000_TCP_PORT,
        'mongodb': 'mongodb://'+process.env.MONGO_PORT_27017_TCP_ADDR +':'+
                                process.env.MONGO_PORT_27017_TCP_PORT + '/DS'
    },
    cloudlets: ['s3', 'azure', 'google']
};
