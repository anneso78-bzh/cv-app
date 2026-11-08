import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CVData } from '../models/cv-data.model';

@Injectable({
  providedIn: 'root'
})
export class CvDataService {
  private readonly dataUrl = 'assets/data/cv-data.json';

  constructor(private http: HttpClient) {}

  getCVData(): Observable<CVData> {
    return this.http.get<CVData>(this.dataUrl);
  }
}
