import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Campaign } from '../models/campaign';
import { ContactFormField } from '../models/contact-form-field';
import { Observable, of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  public campaign;
  private campaignName = environment.campaignName;
  private bucketSlug = environment.bucketSlug;
  private cosmicUrl = environment.cosmicAPI_URL;

  constructor(private http: HttpClient) {
  }

  public getCampaignData(): Observable<Campaign> {
    return this.http.get<any>(this.cosmicUrl + this.bucketSlug + '/object/' + this.campaignName, {
      params: {
        read_key: environment.readKey
      }
    }).pipe(
      map(data => (
        {
          slug: data.object.slug,
          title: data.object.title,
          content: data.object.content,
          headline: data.object.metadata.headline,
          signupMessage: data.object.metadata.sign_up_message,
          thankYouMessage: data.object.metadata.thank_you_message,
          heroImageUrl: data.object.metadata.hero_image.url,
          materials: data.object.metadata.campaign_materials,
          signup_list: data.object.metadata.signup_list
        }
      )
    ));
  }

  public getSignupForm(): Observable<ContactFormField[]> {
    return this.http.get<any>(this.cosmicUrl + this.bucketSlug + '/object-types', {
      params: {
        read_key: environment.readKey
      }
    })
    .pipe(
      map(res => res.object_types.filter(x => x.slug === 'contacts')[0].metafields)
    );

  }

  public saveContact(fields: ContactFormField[], form: FormGroup): Observable<any> {
    this.getFieldValuesFromForm(fields, form);
    const firstName = fields.find(f => f.key === 'first_name').value;
    const lastName = fields.find(f => f.key === 'last_name').value;
    let contactPostBody = {
      slug:  `${firstName}-${lastName}-${new Date().getTime()}`,
      type_slug: "contacts",
      title: `${firstName} ${lastName}`,
      metafields: fields,
      write_key: environment.writeKey
    };
    return this.http.post(`${this.cosmicUrl}${this.bucketSlug}/add-object`, contactPostBody);
  }

  public addContactToCampaign(contactResponse: any): Observable<any> {
    return this.getCampaignData()
                .pipe(
                  flatMap(response => {
                    this.campaign = response;
                    let contactsList = this.campaign.signup_list ? this.campaign.signup_list.map(l => l._id).join() + ',' + contactResponse.object._id  : contactResponse.object._id;
                    let objects = this.campaign.signup_list ? this.campaign.signup_list.push(contactResponse) : contactResponse;
                    let postBody = {
                      slug: this.campaign.slug,
                      metafields: [
                        {
                          type: 'objects',
                          key: 'signup_list',
                          title: 'Signup List',
                          value: contactsList
                        }
                      ],
                      write_key: environment.writeKey
                    };
                    return this.http.patch(`${this.cosmicUrl}${this.bucketSlug}/edit-object-metafields`, postBody);
                  })
                );
  }

  private getFieldValuesFromForm(fields: ContactFormField[], form: FormGroup) {
    fields.forEach(f => {
      f.value = form.controls[f.key].value;
    });
  }



}
