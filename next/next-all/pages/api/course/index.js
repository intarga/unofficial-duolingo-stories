import query from "../../../lib/db"

export default async function index(req, res) {
    let answer = await get_courses();
    return res.status(200).json(answer);
}

export async function get_courses() {
    let courses = await query(`
SELECT course.id,  COALESCE(NULLIF(course.name, ''), l2.name) as name,
 l1.short AS fromLanguage, l1.name AS fromLanguageName, l1.flag_file AS fromLanguageFlagFile, l1.flag AS fromLanguageFlag,
 l2.short AS learningLanguage, l2.name AS learningLanguageName, l2.flag_file AS learningLanguageFlagFile, l2.flag AS learningLanguageFlag,
 COUNT(story.id) count, course.public, course.official, course.conlang FROM course
LEFT JOIN language l1 ON l1.id = course.fromLanguage
LEFT JOIN language l2 ON l2.id = course.learningLanguage
LEFT JOIN story ON (course.id = story.course_id)
WHERE story.public = 1 AND story.deleted = 0 AND course.public = 1
GROUP BY course.id
ORDER BY name;
    `);
    // sort courses by base language
    let base_languages = {};
    let languages = [];
    // iterate over all courses
    for (let course of courses) {
        // if base language not yet in list
        if (base_languages[course.fromLanguageName] === undefined) {
            // initialize the list
            base_languages[course.fromLanguageName] = [];
            // and add it to the list of all base languages (we will add English after sorting in the front)
            if (course.fromLanguageName !== "English")
                languages.push(course.fromLanguageName);
        }
        base_languages[course.fromLanguageName].push(Object.assign({}, course));
    }
    // sort the base languages and then add English as first (and most relevant)
    languages = languages.sort();
    // if we have english courses add "English" as the first entry
    if (base_languages["English"])
        languages.unshift("English");

    // create a new sorted
    let grouped_languages = {};
    for (let lang of languages) {
        grouped_languages[lang] = base_languages[lang];
    }

    return grouped_languages;
}

export async function get_courses_ungrouped() {
    let courses = await query(`
SELECT course.id,  COALESCE(NULLIF(course.name, ''), l2.name) as name,
 l1.short AS fromLanguage, l1.name AS fromLanguageName, l1.flag_file AS fromLanguageFlagFile, l1.flag AS fromLanguageFlag,
 l2.short AS learningLanguage, l2.name AS learningLanguageName, l2.flag_file AS learningLanguageFlagFile, l2.flag AS learningLanguageFlag,
 COUNT(story.id) count, course.public, course.official, course.conlang FROM course
LEFT JOIN language l1 ON l1.id = course.fromLanguage
LEFT JOIN language l2 ON l2.id = course.learningLanguage
LEFT JOIN story ON (course.id = story.course_id)
WHERE story.deleted = 0
GROUP BY course.id
ORDER BY count DESC;
    `);
    return courses.map((d) => {return {...d}});
}