// Import the necessary forms
const fs = require('fs');
const crypto = require('crypto');
const Excel = require('exceljs');
const path = require('path');


/*  [ 'RSA-MD4',
  'RSA-MD5',
  'RSA-MDC2',
  'RSA-RIPEMD160',
  'RSA-SHA1',
  'RSA-SHA1-2',
  'RSA-SHA224',
  'RSA-SHA256',
  'RSA-SHA3-224',
  'RSA-SHA3-256',
  'RSA-SHA3-384',
  'RSA-SHA3-512',
  'RSA-SHA384',
  'RSA-SHA512',
  'RSA-SHA512/224',
  'RSA-SHA512/256',
  'RSA-SM3',
  'blake2b512',
  'blake2s256',
  'id-rsassa-pkcs1-v1_5-with-sha3-224',
  'id-rsassa-pkcs1-v1_5-with-sha3-256',
  'id-rsassa-pkcs1-v1_5-with-sha3-384',
  'id-rsassa-pkcs1-v1_5-with-sha3-512',
  'md4',
  'md4WithRSAEncryption',
  'md5',
  'md5-sha1',
  'md5WithRSAEncryption',
  'mdc2',
  'mdc2WithRSA',
  'ripemd',
  'ripemd160',
  'ripemd160WithRSA',
  'rmd160',
  'sha1',
  'sha1WithRSAEncryption',
  'sha224',
  'sha224WithRSAEncryption',
  'sha256',
  'sha256WithRSAEncryption',
  'sha3-224',
  'sha3-256',
  'sha3-384',
  'sha3-512',
  'sha384',
  'sha384WithRSAEncryption',
  'sha512',
  'sha512-224',
  'sha512-224WithRSAEncryption',
  'sha512-256',
  'sha512-256WithRSAEncryption',
  'sha512WithRSAEncryption',
  'shake128',
  'shake256',
  'sm3',
  'sm3WithRSAEncryption',
  'ssl3-md5',
  'ssl3-sha1',
  'whirlpool' ] */
// Gets a list of available encryption algorithms
var ciphers = crypto.getCiphers();

// List of algorithms to be tested
const algorithms = ['sha1', 'sha256', 'md5', 'sha512', 'sha3-256','shake256'];

// Example of use:
const folderPath = './files/';
const getAllFilesInFolderSync = (folderPath) => {
  try {
      const files = fs.readdirSync(folderPath);
      const filePaths = files.map(file => path.join(folderPath, file));
      return filePaths;
  } catch (error) {
      console.error("Si è verificato un errore:", error);
      return [];
  }
};
const allFiles = getAllFilesInFolderSync(folderPath);
const repetitions = 50; // numero di volte che viene eseguito l'algoritmo i-esimo su un file

// Function to hash a file using a given algorithm
function hashFileWithAlgorithm(filePath,algorithm, callback) {
  const hash = crypto.createHash(algorithm);
  const readStream = fs.createReadStream(filePath);
  
  // Reads the file chunk by chunk and updates the hash
  readStream.on('data', (chunk) => {
    hash.update(chunk);
  });

  // When the reading of the file is complete, it calculates the final hash
  readStream.on('end', () => {
    const hashedData = hash.digest('hex');
    callback(null, hashedData);
  });

  // Handles any errors when reading the file
  readStream.on('error', (err) => {
    callback(err, null);
  });
}
// Returns the size of the file 
async function getFileSizeInMB(filePath) {
  return new Promise((resolve, reject) => {
    // Uses fs.stat to get the information about the file
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error('Si è verificato un errore durante il recupero delle informazioni sul file:', err);
        reject(err);
        return;
      }

      // The size of the file is contained in stats.size
      const fileSizeInMB = stats.size / (1024 * 1024); // Converti direttamente in megabyte
      resolve(fileSizeInMB.toFixed(5)); // Risolve la Promise con il valore in MB
    });
  });
}

// Function to measure the time it takes to run a hashing algorithm
const measureTimeForAlgorithm = (filePath,algorithm) => {
  return new Promise((resolve, reject) => {
    const times = [];
    let count = 0;
    let hash = '';
    let timesConsole = [];

    // Recursive function to run the algorithm multiple times
    function hashAndMeasureTime() {
      const startTime = process.hrtime();

      // Hashes the file with the specified algorithm
      hashFileWithAlgorithm(filePath, algorithm, async (err, hashedData) => {
        if (err) {
          reject(`Errore nell'hashing con l'algoritmo ${algorithm}: ${err}`);
          return;
        }
        const endTime = process.hrtime(startTime);
        const durationInSeconds = endTime[0] + endTime[1] / 1e9;
        times.push(durationInSeconds);
        timesConsole.push(durationInSeconds);
        count++;
        // Print the time taken to hash
        console.log(`Tempo di esecuzione ${count} dell'algoritmo ${algorithm}: ${durationInSeconds} secondi`);
        hash = hashedData;
        if (count < repetitions) {
          // If there are still repetitions to be done, call the recursive function again
          hashAndMeasureTime();
        } else {
          // If the repetitions are finished, it calculates the average time and solves the Promise
          const averageTime = (times.reduce((acc, curr) => acc + curr, 0) / repetitions).toFixed(5);
          const fileSizeInMB = await getFileSizeInMB(filePath);
          // If repetitions are finite, it calculates megabytes per second hashati.
          const megabyteForSecond = (averageTime / fileSizeInMB).toFixed(5);
          resolve({ algorithm, averageTime, hash, times: timesConsole ,megabyteForSecond, fileSizeInMB,filePath});
        }
      });
    }

    
    // Avvia la prima esecuzione dell'algoritmo
    hashAndMeasureTime();
  });
}

// Function to measure the execution time for all specified algorithms
const measureTimeForAlgorithms = async (allFiles,algorithms) => {
  // Crea un nuovo file Excel per salvare i risultati
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Hash files');
  
  // Defines the columns of the Excel worksheet
  worksheet.columns = [
    { header: 'File', key: 'file' },
    { header: 'Algorithm', key: 'algorithm' },
    { header: 'Average Time (s)', key: 'averageTime' },
    { header: 'Mb/s', key: 'MbForSecond' },
    { header: 'Times (s)', key: 'times' },
    { header: 'Hash', key: 'hash' },
    { header: 'Size File', key: 'fileSizeInMB' },
  ];
  for (const file of allFiles) {
    let counter = 0; // Variable to keep track of the counter
  // For each algorithm, measure the execution time and record the results in the Excel worksheet
    for (const algorithm of algorithms) {
      try {
        const result = await measureTimeForAlgorithm(file,algorithm);
        console.log(`\nMedia dei tempi di esecuzione per l'algoritmo ${result.algorithm}: ${result.averageTime} secondi`);
        console.log(`\nHash del file per l'algoritmo ${result.algorithm}: ${result.hash}`);
        console.log(`\nTempi di esecuzione per l'algoritmo ${result.algorithm}: ${result.times.join(', ')} secondi`);
        console.log(`\nLa velocità media di esecuzione al secondo è  ${result.megabyteForSecond} MB/S`);
        console.log(`\nLa dimensione del file è ${result.fileSizeInMB} MB`);
        counter++;
        // Create a formatted string for run times
        const formattedTimes = `{${result.times.join('/')}}`;

        // Adds a row to the Excel worksheet with the results
        let  row = {
          file : result.filePath.replace(/.*\//, ""),
          algorithm: result.algorithm,
          averageTime: result.averageTime,
          MbForSecond: result.megabyteForSecond,
          times: formattedTimes,
          hash: result.hash,
          fileSizeInMB: result.fileSizeInMB
        };
        worksheet.addRow(row);
        if (file.length === counter){
          counter=0;
          console.log('ULTIMO', counter)
        worksheet.addRow([]);
        }
      } catch (error) {
        // Handles any errors during the execution of the algorithm
        console.error(error);
      }
  }
}
  // Save Excel worksheet to file
  workbook.xlsx.writeFile('hashing_result.xlsx')
    .then(() => {
      console.log('Il file Excel "hashing_result.xlsx" è stato creato con successo.');
    })
    .catch((error) => {
      console.error('Errore durante la scrittura del file Excel:', error);
    });
}
// Starts execution time measurement for all specified algorithms
 measureTimeForAlgorithms(allFiles, algorithms);
