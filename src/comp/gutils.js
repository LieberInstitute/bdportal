import {MW_SERVER} from '../appcfg'

export function getRGBLuminance(color) {
    const f=color.split(","),R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return Math.floor((2.99 * R + 5.87 * G + 1.14 * B)/10);
}
    
export function shadeRGBColor(color, percent) {
      const f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
      return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
}

export function blendRGBColors(c0, c1, p) {
    const f=c0.split(","),t=c1.split(","),R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return "rgb("+(Math.round((parseInt(t[0].slice(4))-R)*p)+R)+","+(Math.round((parseInt(t[1])-G)*p)+G)+","+(Math.round((parseInt(t[2])-B)*p)+B)+")";
}
 

export function rowCSV(row) {
    let r = '';
    for (let j = 0; j < row.length; j++) {
        let val = row[j] === null ? '' : row[j].toString();
        if (row[j] instanceof Date) {
            val = row[j].toLocaleString();
        }
        let str = val.replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0)
            str = '"' + str + '"';
        if (j > 0)
            r += ',';
        r += str;
    }
    r+='\n'
    return r;
}


export function rowTSV(row) {
    let r = '';
    for (let j = 0; j < row.length; j++) {
        let val = row[j] === null ? '' : row[j].toString();
        if (row[j] instanceof Date) {
            val = row[j].toLocaleString();
        }
        const regex=/[\t\n]/g;
        let str = val.replace(regex, ' ');
        if (j > 0)
            r += '\t';
        r += str;
    }
    r+='\n'
    return r;
}

export async function saveFile(fdata, fname, mimeType) {
        if (!mimeType) 
           mimeType="text/plain:charset-utf-8";
        const blob = new Blob( [ fdata ], { type: mimeType }); // "text/plain:charset-utf-8" ?
        const a = document.createElement('a');
        a.download = fname;
        a.href = URL.createObjectURL(blob);
        a.addEventListener('click', () => {
          setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000); //prevent timeout?
        });
        document.body.appendChild(a); //FF needs this
        a.click();
        document.body.removeChild(a); //FF needed this
}

export async function saveRStagedFile(relpath, newfname) {
    const a = document.createElement('a');
    a.href = `${MW_SERVER}/rstaging/${relpath}`;
    if (newfname && newfname.length) {
       //NOTE: download attribute only honored for links to resources with the same origin !!
       a.download = newfname; 
    }
    //a.addEventListener('click', () => {
    //  setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000); //prevent timeout?
    //});
    document.body.appendChild(a); //FF needs this
    a.click();
    //a.remove();
    document.body.removeChild(a); //FF needed this
}
