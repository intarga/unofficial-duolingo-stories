import styles from "./set_list.module.css"
import StoryButton from "./story_button";
import query from "lib/db";
import {getServerSession} from "next-auth/next";
import {authOptions} from "pages/api/auth/[...nextauth]";
import {notFound} from "next/navigation";

export async function get_course_done(course_id, username) {
    const done_query = await query(`SELECT s.id FROM story_done JOIN story s on s.id = story_done.story_id WHERE user_id = (SELECT id FROM user WHERE username = ?) AND s.course_id = (SELECT id FROM course WHERE short = ?) GROUP BY s.id`, [username, course_id]);
    const done = {}
    for(let d of done_query) {
        done[d.id] = true;
    }

    return done;
}

export async function get_course(course_id) {

    const course_query = await query(`
        SELECT course.id, course.short, course.about, 
        l1.short AS fromLanguage, l1.name AS fromLanguageName, l1.flag_file AS fromLanguageFlagFile, l1.flag AS fromLanguageFlag,
        l2.short AS learningLanguage, l2.name AS learningLanguageName, l2.flag_file AS learningLanguageFlagFile, l2.flag AS learningLanguageFlag     
        FROM course 
        LEFT JOIN language l1 ON l1.id = course.fromLanguage
        LEFT JOIN language l2 ON l2.id = course.learningLanguage
        WHERE course.short = ? LIMIT 1
        `, [course_id]);

    if(course_query.length === 0)
        return undefined;
    const course = Object.assign({}, course_query[0]);

    const res = await query(`
        SELECT story.id, story.set_id, story.set_index, story.name,
        i.active, i.activeLip, i.gilded, i.gildedLip
        FROM story
        JOIN image i on story.image = i.id
        WHERE story.public = 1 AND story.deleted = 0 AND story.course_id = (SELECT c.id FROM course c WHERE c.short = ?)
        GROUP BY story.id
        ORDER BY set_id, set_index;
        `, [course_id]);
    if(res.length === 0)
        return {...course, sets: [], count: 0};

    // group into sets
    let set = -1;
    let sets = [];
    for(let d of res) {
        if (set !== d.set_id) {
            set = d.set_id;
            sets.push([]);
        }
        sets[sets.length - 1].push(Object.assign({}, d));
    }

    let count = 0;
    for(let set of sets)
        count += set.length;

    return {...course, sets: sets, count: count};
}


export default async function SetList({course_id}) {
    if(!course_id) {
        return <div className={styles.story_list}>
            {[...Array(2)].map((d, i) => (
                <div key={i} className={styles.set_list}>
                    <div className={styles.set_title}>Set {i+1}</div>
                    {[...Array(4)].map((d, i) => (
                        <StoryButton key={i}  />
                    ))}
                </div>
            ))}
        </div>
    }

    const session = await getServerSession(authOptions);

    let done = {};

    if(session?.user?.name) {
        done = await get_course_done(course_id, session?.user?.name);
    }

    const course = await get_course(course_id);
    if(!course)
        notFound();

    return <div className={styles.story_list}>
        {course.about ?
            <div className={styles.set_list}>
                <div className={styles.set_title}>About</div><p>
                {course.about}
            </p>
            </div>
            : <></>}
        {course.sets.map(set => (
            <div key={set[0].set_id} className={styles.set_list}>
                <div className={styles.set_title}>Set {set[0].set_id}</div>
                {set.map(story => (
                    <StoryButton key={story.id} story={story} done={done[story.id]} />
                ))}
            </div>
        ))}
    </div>
}