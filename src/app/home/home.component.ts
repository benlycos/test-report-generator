import { Component, OnInit } from '@angular/core';
import untar from 'js-untar';
import pako from 'pako';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  quote: string | undefined;
  isLoading = false;
  measurementError = false;
  city = '-';
  region = '-';
  speedTestServerLocation = '-';
  finalResult: any = [];
  Math = Math;
  overAllError = '';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.isLoading = false;
      console.log(params['file-path']);
      const url = `https://benlycos.github.io/automation-results/${params['file-path']}`;
      fetch(url)
        .then((res) => res.arrayBuffer()) // Download gzipped tar file and get ArrayBuffer
        .then(pako.inflate) // Decompress gzip using pako
        .then((arr: any) => arr.buffer) // Get ArrayBuffer from the Uint8Array pako returns
        .then(untar) // Untar
        .then(async (files) => {
          // js-untar returns a list of files (See https://github.com/InvokIT/js-untar#file-object for details)
          for (const eachFile of files) {
            const intfData = eachFile.name.split('/')[1].split('--');
            let interfaceRoute = [];
            if (eachFile.name.endsWith('.log')) {
              if (intfData[0] == 'all') {
                intfData[0] = 'net';
              }
              for (const eachline of eachFile.readAsString().split('\n')) {
                if (eachline.indexOf('UG') > -1 && eachline.indexOf(intfData[0]) > -1) {
                  interfaceRoute.push(eachline);
                }
              }
              if (interfaceRoute.length > 1 && intfData[0] != 'net') {
                this.measurementError = true;
              }
            } else if (eachFile.name.endsWith('.json')) {
              if (eachFile.readAsString() != '') {
                const speedTestData = eachFile.readAsJSON();
                if (intfData[0] != 'final_result' && intfData[0] != 'final_error') {
                  if (intfData[0] == 'all' && intfData[1] == 'upload') {
                    const serverLocation: any = await this.http
                      .get(`https://ipinfo.io/${speedTestData.client.ip}?token=bb3c5c215f9949`)
                      .toPromise();
                    this.city = serverLocation.city;
                    this.region = serverLocation.region;
                    this.speedTestServerLocation = speedTestData.server.name;
                  }
                } else if (intfData[0] == 'final_error') {
                  this.overAllError = `Following measurement didnt work "${Object.keys(speedTestData).join(',')}"`;
                  console.log(this.overAllError);
                } else {
                  for (const eachData of Object.keys(speedTestData)) {
                    if (eachData.indexOf('net') > -1) {
                      this.finalResult.push({ ...{ name: eachData }, ...speedTestData[eachData] });
                    }
                  }
                  this.finalResult = [
                    ...this.finalResult,
                    ...[
                      { upload: speedTestData.upload, download: speedTestData.download, name: 'total' },
                      {
                        upload: speedTestData.upload_aggr_perc,
                        download: speedTestData.download_aggr_perc,
                        name: 'aggregation',
                      },
                    ],
                  ];
                }
              }
            }
          }
        })
        .catch((err) => {
          this.overAllError = 'measurement file does not exist or is invalid';
        });
    });
  }
}
