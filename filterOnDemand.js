const fs = require('fs');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { pick } = require('stream-json/filters/Pick');
const { streamValues } = require('stream-json/streamers/StreamValues');

const inputFile = 'data/ecs_pricing.json';
const outputFile = 'data/filtered_ecs.json';

const products = {};
const filtered = [];

// First, stream and collect products
const productsPipeline = chain([
    fs.createReadStream(inputFile),
    parser(),
    pick({ filter: 'products' }),
    streamValues(),
]);

productsPipeline.on('data', ({ value }) => {
    Object.assign(products, value);
});

productsPipeline.on('end', () => {
    // Now stream OnDemand terms and filter
    const termsPipeline = chain([
        fs.createReadStream(inputFile),
        parser(),
        pick({ filter: 'terms.OnDemand' }),
        streamValues(),
    ]);

    termsPipeline.on('data', ({ value }) => {
        for (const sku in value) {
            for (const offerId in value[sku]) {
                const offer = value[sku][offerId];
                for (const pdId in offer.priceDimensions) {
                    const pd = offer.priceDimensions[pdId];
                    const price = parseFloat(pd.pricePerUnit.USD);
                    if (price < 10) {
                        const attrs = products[sku]?.attributes || {};
                        filtered.push({
                            sku,
                            ...attrs,
                            unit: pd.unit,
                            // servicecode: attrs.servicecode,
                            // servicename: attrs.servicename,
                            // location: attrs.location,
                            // instanceType: attrs.instanceType,
                            // instanceFamily: attrs.instanceFamily,
                            // vcpu: attrs.vcpu,
                            // physicalProcessor: attrs.physicalProcessor,
                            // clockSpeed: attrs.clockSpeed,
                            // memory: attrs.memory,
                            // storage: attrs.storage,
                            // networkPerformance: attrs.networkPerformance,
                            // processorArchitecture: attrs.processorArchitecture,
                            // tenancy: attrs.tenancy,
                            // operatingSystem: attrs.operatingSystem,
                            // dedicatedEbsThroughput: attrs.dedicatedEbsThroughput,
                            hourlyCost: price,
                        });
                    }
                }
            }
        }
    });

    termsPipeline.on('end', () => {
        fs.writeFileSync(outputFile, JSON.stringify(filtered, null, 2));
        console.log(`Filtered data written to ${outputFile}`);
    });
});