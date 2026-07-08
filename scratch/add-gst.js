const fs = require('fs');

const path = '/home/lenovo-x390/vensysco/bssc/src/database/seeders/states-and-districts.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const gstCodes = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  "Punjab": "03",
  "Chandigarh (UT)": "04",
  "Uttarakhand": "05",
  "Haryana": "06",
  "Delhi (NCT)": "07",
  "Rajasthan": "08",
  "Uttar Pradesh": "09",
  "Bihar": "10",
  "Sikkim": "11",
  "Arunachal Pradesh": "12",
  "Nagaland": "13",
  "Manipur": "14",
  "Mizoram": "15",
  "Tripura": "16",
  "Meghalaya": "17",
  "Assam": "18",
  "West Bengal": "19",
  "Jharkhand": "20",
  "Odisha": "21",
  "Chhattisgarh": "22",
  "Madhya Pradesh": "23",
  "Gujarat": "24",
  "Daman and Diu (UT)": "25",
  "Dadra and Nagar Haveli (UT)": "26",
  "Maharashtra": "27",
  "Andhra Pradesh": "37",
  "Karnataka": "29",
  "Goa": "30",
  "Lakshadweep (UT)": "31",
  "Kerala": "32",
  "Tamil Nadu": "33",
  "Puducherry (UT)": "34",
  "Andaman and Nicobar Islands (UT)": "35",
  "Telangana": "36",
  "Ladakh (UT)": "38"
};

data.states.forEach(s => {
  if (gstCodes[s.state]) {
    s.gstCode = gstCodes[s.state];
  } else {
    console.log("Missing GST code for:", s.state);
  }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log("Done!");
